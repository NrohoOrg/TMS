import math
import traceback
from typing import Literal

from fastapi import FastAPI
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from pydantic import BaseModel, Field

app = FastAPI()

NO_DRIVER_AVAILABLE = "NO_DRIVER_AVAILABLE"
TIME_WINDOW_INFEASIBLE = "TIME_WINDOW_INFEASIBLE"
CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED"
SOLVER_TIMEOUT = "SOLVER_TIMEOUT"

LARGE_CAPACITY = 999999

# Internal arc-cost unit: micro-DZD (1e-6 DZD). Keeps OR-Tools integer arc
# costs precise without losing sub-meter / sub-second resolution.
DZD_TO_MICRO = 1_000_000


class ConfigIn(BaseModel):
    maxSolveSeconds: int = Field(30, ge=1)
    speedKmh: float = Field(50, gt=0)
    returnToDepot: bool = False
    # R5.2.4: hard pairwise upper bound on dropoff time relative to pickup.
    # Replaces the per-task dropoffDeadlineS with a global rule.
    dropoffWithinSeconds: int = Field(7200, ge=1)
    # Service time applied at every dropoff node (handover, signature).
    # Worker overrides via Config.dropoffServiceMinutesDefault × 60.
    dropoffServiceSeconds: int = Field(300, ge=0)
    # Carpool / shared-trip support: when the route visits the same
    # coordinates back-to-back, every stop except the last in the cluster
    # contributes only this marginal service time, and the full service
    # is paid once when the driver actually leaves the cluster. Default
    # 60 s ≈ "name confirm + door close per extra rider".
    colocatedMarginalServiceSeconds: int = Field(60, ge=0)
    # Deprecated: superseded by loadBalancingDzdPerActiveMinute. The
    # task-count-based fairness term it controlled treated 3 colocated
    # pickups as 3 stops of "load" and was blind to per-driver idle gaps,
    # so it sometimes shoved a near-cluster task onto a driver who was
    # busy across the city, or left a driver idle for hours. Kept here
    # only so older worker payloads still validate; ignored at solve time.
    loadBalancingDzdPerTask: int = Field(0, ge=0)
    # Fairness lever: penalty (DZD) per minute of *active working time*
    # imbalance between the busiest and least-busy driver. Active time
    # counts travel + service (with the colocated-marginal collapse) but
    # excludes any idle wait at pickup time windows, so it correctly
    # rewards filling a driver's dead time with mid-shift tasks. Default
    # 2.0 ≈ 120 DZD per hour of imbalance — same magnitude as the old
    # ~42 DZD/task lever at a typical 20 min/task.
    loadBalancingDzdPerActiveMinute: float = Field(2.0, ge=0)
    # OR objective coefficients (micro-DZD). The arc cost evaluated by
    # OR-Tools is fuel + time, both in the same unit:
    #   arc_micro_dzd = distance_m × fuelCostMicroDzdPerMeter
    #                 + travel_s × timeCostMicroDzdPerSecond
    # Defaults: 2820 ≈ 2.82 DZD/km (6 L/100km × 47 DZD/L).
    #           19444 ≈ 70 DZD/hour.
    fuelCostMicroDzdPerMeter: int = Field(2820, ge=0)
    timeCostMicroDzdPerSecond: int = Field(19444, ge=0)
    # Penalty (DZD) for leaving a task unassigned. Sized to dwarf any
    # plausible arc cost so every feasible task is assigned; the
    # unassigned[] response only carries genuinely infeasible tasks.
    # Translated to micro-DZD internally to match the arc-cost scale.
    unassignedPenaltyNormalDzd: int = Field(100000, ge=0)
    unassignedPenaltyUrgentDzd: int = Field(1000000, ge=0)


class DriverIn(BaseModel):
    id: str
    shiftStartS: int
    shiftEndS: int
    depotLat: float
    depotLng: float
    capacityUnits: int | None = None


class TaskIn(BaseModel):
    id: str
    priority: Literal["normal", "urgent"] = "normal"
    pickupLat: float
    pickupLng: float
    pickupWindowStartS: int
    pickupWindowEndS: int
    pickupServiceS: int
    dropoffLat: float
    dropoffLng: float
    capacityUnits: int = Field(ge=1)


class OptimizeRequest(BaseModel):
    jobId: str
    config: ConfigIn
    drivers: list[DriverIn]
    tasks: list[TaskIn]
    # Optional pre-computed road-routing matrices, indexed in the exact node
    # order this service builds internally (depot_start × D, depot_end × D,
    # then per-task [pickup, dropoff] pairs). When provided, these replace
    # the in-process haversine fallback. Worker on the API side is the
    # canonical source: it caches Google Distance Matrix results in
    # Postgres and forwards the result here.
    distanceMatrixM: list[list[int]] | None = None
    timeMatrixS: list[list[int]] | None = None


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    earth_radius_m = 6371000.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return int(round(earth_radius_m * c))


def _unassigned_reason(
    task: TaskIn,
    drivers: list[DriverIn],
    has_capacity: bool,
    dropoff_within_seconds: int,
) -> str:
    if not drivers:
        return NO_DRIVER_AVAILABLE
    task_latest_dropoff = task.pickupWindowStartS + dropoff_within_seconds
    overlaps = [
        d
        for d in drivers
        if d.shiftStartS <= task_latest_dropoff and d.shiftEndS >= task.pickupWindowStartS
    ]
    if not overlaps:
        return TIME_WINDOW_INFEASIBLE
    if has_capacity:
        capacity_drivers = [d for d in drivers if d.capacityUnits is not None]
        if capacity_drivers and all(d.capacityUnits < task.capacityUnits for d in capacity_drivers):
            return CAPACITY_EXCEEDED
    return NO_DRIVER_AVAILABLE


@app.get("/health")
def health():
    return {"status": "ok", "service": "optimizer"}


@app.get("/optimizer/health")
def optimizer_health():
    return {"status": "ok", "service": "optimizer"}


@app.post("/optimize")
def optimize(body: OptimizeRequest):
    try:
        job_id = body.jobId
        drivers = body.drivers
        tasks = body.tasks
        if not drivers:
            return {
                "jobId": job_id,
                "status": "completed",
                "routes": [],
                "unassigned": [
                    {"taskId": task.id, "reason": NO_DRIVER_AVAILABLE} for task in tasks
                ],
            }
        num_drivers = len(drivers)
        num_tasks = len(tasks)

        node_coords: list[tuple[float, float]] = []
        node_kinds: list[str] = []
        node_task_idx: list[int | None] = []
        service_s: list[int] = []
        pickup_nodes: list[int] = []
        dropoff_nodes: list[int] = []

        for driver in drivers:
            node_coords.append((driver.depotLat, driver.depotLng))
            node_kinds.append("depot_start")
            node_task_idx.append(None)
            service_s.append(0)
        for driver in drivers:
            node_coords.append((driver.depotLat, driver.depotLng))
            node_kinds.append("depot_end")
            node_task_idx.append(None)
            service_s.append(0)
        for task_index, task in enumerate(tasks):
            pickup_nodes.append(len(node_coords))
            node_coords.append((task.pickupLat, task.pickupLng))
            node_kinds.append("pickup")
            node_task_idx.append(task_index)
            service_s.append(task.pickupServiceS)

            dropoff_nodes.append(len(node_coords))
            node_coords.append((task.dropoffLat, task.dropoffLng))
            node_kinds.append("dropoff")
            node_task_idx.append(task_index)
            service_s.append(body.config.dropoffServiceSeconds)

        total_nodes = len(node_coords)
        precomputed_distance = body.distanceMatrixM
        precomputed_time = body.timeMatrixS
        if precomputed_distance is not None and precomputed_time is not None:
            if (
                len(precomputed_distance) != total_nodes
                or len(precomputed_time) != total_nodes
                or any(len(row) != total_nodes for row in precomputed_distance)
                or any(len(row) != total_nodes for row in precomputed_time)
            ):
                raise ValueError(
                    f"Pre-computed matrices must be {total_nodes}×{total_nodes}"
                )
            distance_matrix = [list(row) for row in precomputed_distance]
            time_matrix = [list(row) for row in precomputed_time]
            for i in range(total_nodes):
                distance_matrix[i][i] = 0
                time_matrix[i][i] = 0
        else:
            speed_mps = body.config.speedKmh * 1000.0 / 3600.0
            distance_matrix = [[0] * total_nodes for _ in range(total_nodes)]
            time_matrix = [[0] * total_nodes for _ in range(total_nodes)]
            for i in range(total_nodes):
                lat1, lng1 = node_coords[i]
                for j in range(total_nodes):
                    if i == j:
                        continue
                    lat2, lng2 = node_coords[j]
                    distance_m = _haversine_m(lat1, lng1, lat2, lng2)
                    travel_s = int(round(distance_m / speed_mps))
                    if distance_m > 0 and travel_s == 0:
                        travel_s = 1
                    distance_matrix[i][j] = distance_m
                    time_matrix[i][j] = travel_s

        starts = list(range(num_drivers))
        ends = list(range(num_drivers, 2 * num_drivers))
        manager = pywrapcp.RoutingIndexManager(total_nodes, num_drivers, starts, ends)
        routing = pywrapcp.RoutingModel(manager)
        solver = routing.solver()

        return_to_depot = body.config.returnToDepot

        def distance_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            if not return_to_depot and node_kinds[to_node] == "depot_end":
                return 0
            return distance_matrix[from_node][to_node]

        distance_idx = routing.RegisterTransitCallback(distance_callback)

        fuel_coef = body.config.fuelCostMicroDzdPerMeter
        time_coef = body.config.timeCostMicroDzdPerSecond

        def travel_seconds(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            if not return_to_depot and node_kinds[to_node] == "depot_end":
                return 0
            return time_matrix[from_node][to_node]

        def arc_cost_callback(from_index: int, to_index: int) -> int:
            distance_m = distance_callback(from_index, to_index)
            travel_s = travel_seconds(from_index, to_index)
            return distance_m * fuel_coef + travel_s * time_coef

        arc_cost_idx = routing.RegisterTransitCallback(arc_cost_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(arc_cost_idx)

        marginal_service = body.config.colocatedMarginalServiceSeconds

        def time_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            travel = travel_seconds(from_index, to_index)
            # Carpool / shared-trip: when the next stop on the route is
            # at the same coordinates as the current stop AND both are
            # task service events (not a depot transition), the current
            # stop's service collapses to a small marginal cost. The
            # full service is paid only when the driver leaves the
            # cluster (i.e. the next stop is somewhere different).
            if (
                node_kinds[from_node] in {"pickup", "dropoff"}
                and node_kinds[to_node] in {"pickup", "dropoff"}
                and node_coords[from_node] == node_coords[to_node]
            ):
                return marginal_service + travel
            return service_s[from_node] + travel

        time_idx = routing.RegisterTransitCallback(time_callback)
        dropoff_within_seconds = body.config.dropoffWithinSeconds
        max_shift_end = max(driver.shiftEndS for driver in drivers)
        max_task_time = max(
            [0]
            + [task.pickupWindowEndS for task in tasks]
            + [task.pickupWindowStartS + dropoff_within_seconds for task in tasks]
        )
        time_horizon = max(24 * 3600, max_shift_end, max_task_time)
        routing.AddDimension(
            time_idx,
            time_horizon,
            time_horizon,
            False,
            "Time",
        )
        time_dim = routing.GetDimensionOrDie("Time")

        for vehicle, driver in enumerate(drivers):
            start_index = routing.Start(vehicle)
            end_index = routing.End(vehicle)
            time_dim.CumulVar(start_index).SetRange(driver.shiftStartS, driver.shiftStartS)
            time_dim.CumulVar(end_index).SetRange(0, driver.shiftEndS)
            routing.AddVariableMinimizedByFinalizer(time_dim.CumulVar(end_index))

        for task_index, task in enumerate(tasks):
            pickup_index = manager.NodeToIndex(pickup_nodes[task_index])
            dropoff_index = manager.NodeToIndex(dropoff_nodes[task_index])
            time_dim.CumulVar(pickup_index).SetRange(
                task.pickupWindowStartS, task.pickupWindowEndS
            )
            # R5.2.4: dropoff bounded relative to pickup by global config rule.
            time_dim.CumulVar(dropoff_index).SetRange(0, time_horizon)
            solver.Add(
                time_dim.CumulVar(dropoff_index)
                <= time_dim.CumulVar(pickup_index) + dropoff_within_seconds
            )

        # Fairness lever: penalise the gap between the busiest and least-busy
        # driver in *active working time* (travel + service, with the
        # colocated-marginal collapse already baked into time_callback).
        # The ActiveTime dimension reuses time_idx with zero slack so its
        # cumul accumulates only effective work — any wait imposed by a
        # pickup time window stays in the Time dimension's slack and does
        # not inflate ActiveTime. Spanning ActiveTime across vehicles via
        # SetGlobalSpanCostCoefficient therefore rewards filling a
        # driver's dead time with mid-shift tasks instead of piling them
        # on a driver who is already busy elsewhere.
        if num_tasks > 0 and body.config.loadBalancingDzdPerActiveMinute > 0:
            routing.AddDimension(
                time_idx,
                0,
                time_horizon,
                True,
                "ActiveTime",
            )
            active_time_dim = routing.GetDimensionOrDie("ActiveTime")
            # Convert DZD/minute → micro-DZD/second so the coefficient
            # matches the cumul's second-resolution units and the same
            # micro-DZD scale as the arc cost.
            coef_per_second = int(round(
                body.config.loadBalancingDzdPerActiveMinute * DZD_TO_MICRO / 60
            ))
            if coef_per_second > 0:
                active_time_dim.SetGlobalSpanCostCoefficient(coef_per_second)

        has_capacity_dimension = any(driver.capacityUnits is not None for driver in drivers)
        if has_capacity_dimension:
            demands = [0] * total_nodes
            for task_index, task in enumerate(tasks):
                demands[pickup_nodes[task_index]] = task.capacityUnits
                demands[dropoff_nodes[task_index]] = -task.capacityUnits

            def demand_callback(index: int) -> int:
                return demands[manager.IndexToNode(index)]

            demand_idx = routing.RegisterUnaryTransitCallback(demand_callback)
            vehicle_capacities = [
                driver.capacityUnits
                if driver.capacityUnits is not None
                else LARGE_CAPACITY
                for driver in drivers
            ]
            routing.AddDimensionWithVehicleCapacity(
                demand_idx,
                0,
                vehicle_capacities,
                True,
                "Capacity",
            )

        # F8 — the DistanceCost span term that previously layered on top of
        # the load-balancing dimension is gone. Fairness is now exactly one
        # knob (loadBalancingDzdPerTask), and arc cost is the only remaining
        # contributor to per-vehicle objective.

        routing.AddDimension(
            distance_idx,
            0,
            10**12,
            True,
            "DistanceMeters",
        )
        distance_dim = routing.GetDimensionOrDie("DistanceMeters")

        priority_penalties_micro = {
            "urgent": body.config.unassignedPenaltyUrgentDzd * DZD_TO_MICRO,
            "normal": body.config.unassignedPenaltyNormalDzd * DZD_TO_MICRO,
        }

        for task_index, task in enumerate(tasks):
            pickup_index = manager.NodeToIndex(pickup_nodes[task_index])
            dropoff_index = manager.NodeToIndex(dropoff_nodes[task_index])
            routing.AddPickupAndDelivery(pickup_index, dropoff_index)
            solver.Add(routing.VehicleVar(pickup_index) == routing.VehicleVar(dropoff_index))
            solver.Add(time_dim.CumulVar(pickup_index) <= time_dim.CumulVar(dropoff_index))
            solver.Add(routing.ActiveVar(pickup_index) == routing.ActiveVar(dropoff_index))
            penalty = priority_penalties_micro.get(
                task.priority, priority_penalties_micro["normal"]
            )
            pickup_penalty = penalty // 2
            dropoff_penalty = penalty - pickup_penalty
            routing.AddDisjunction([pickup_index], pickup_penalty)
            routing.AddDisjunction([dropoff_index], dropoff_penalty)

        search_params = pywrapcp.DefaultRoutingSearchParameters()
        search_params.time_limit.seconds = int(body.config.maxSolveSeconds)
        # PARALLEL_CHEAPEST_INSERTION handles pickup-delivery + tight time
        # windows + disjunctions better than PATH_CHEAPEST_ARC, which can
        # silently fail to construct any first solution.
        search_params.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
        )
        search_params.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        if hasattr(search_params, "random_seed"):
            search_params.random_seed = 0
        if hasattr(search_params, "number_of_workers"):
            search_params.number_of_workers = 1

        solution = routing.SolveWithParameters(search_params)
        status_code = routing.status()
        timeout_code = getattr(pywrapcp.RoutingModel, "ROUTING_FAIL_TIMEOUT", None)
        timed_out = timeout_code is not None and status_code == timeout_code

        if solution is None:
            reason = SOLVER_TIMEOUT if timed_out else None
            return {
                "jobId": job_id,
                "status": "failed" if timed_out else "completed",
                "routes": [],
                "unassigned": [
                    {
                        "taskId": task.id,
                        "reason": reason
                        or _unassigned_reason(task, drivers, has_capacity_dimension, dropoff_within_seconds),
                    }
                    for task in tasks
                ],
            }

        routes = []
        for vehicle in range(num_drivers):
            index = routing.Start(vehicle)
            stops = []
            sequence = 1
            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                if node_kinds[node] in {"pickup", "dropoff"}:
                    task_index = node_task_idx[node]
                    task = tasks[task_index]
                    arrival = int(solution.Value(time_dim.CumulVar(index)))
                    departure = arrival + service_s[node]
                    stops.append(
                        {
                            "taskId": task.id,
                            "type": node_kinds[node],
                            "sequence": sequence,
                            "arrivalS": arrival,
                            "departureS": departure,
                        }
                    )
                    sequence += 1
                index = solution.Value(routing.NextVar(index))

            if stops:
                start_index = routing.Start(vehicle)
                end_index = routing.End(vehicle)
                total_distance = int(
                    solution.Value(distance_dim.CumulVar(end_index))
                    - solution.Value(distance_dim.CumulVar(start_index))
                )
                total_time = int(
                    solution.Value(time_dim.CumulVar(end_index))
                    - solution.Value(time_dim.CumulVar(start_index))
                )
                routes.append(
                    {
                        "driverId": drivers[vehicle].id,
                        "stops": stops,
                        "totalDistanceM": total_distance,
                        "totalTimeS": total_time,
                    }
                )

        unassigned = []
        for task_index, task in enumerate(tasks):
            pickup_index = manager.NodeToIndex(pickup_nodes[task_index])
            if solution.Value(routing.NextVar(pickup_index)) == pickup_index:
                unassigned.append(
                    {
                        "taskId": task.id,
                        "reason": SOLVER_TIMEOUT
                        if timed_out
                        else _unassigned_reason(task, drivers, has_capacity_dimension, dropoff_within_seconds),
                    }
                )

        return {
            "jobId": job_id,
            "status": "completed",
            "routes": routes,
            "unassigned": unassigned,
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "jobId": getattr(body, "jobId", ""),
            "status": "failed",
            "routes": [],
            "unassigned": [],
            "error": str(e),
        }
