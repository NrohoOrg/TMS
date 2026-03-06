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

PRIORITY_PENALTIES = {
    "urgent": 1000,
    "high": 500,
    "normal": 100,
    "low": 10,
}

LARGE_CAPACITY = 999999


class ConfigIn(BaseModel):
    maxSolveSeconds: int = Field(30, ge=1)
    speedKmh: float = Field(40, gt=0)
    returnToDepot: bool = False


class DriverIn(BaseModel):
    id: str
    shiftStartS: int
    shiftEndS: int
    depotLat: float
    depotLng: float
    capacityUnits: int | None = None


class TaskIn(BaseModel):
    id: str
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    pickupLat: float
    pickupLng: float
    pickupWindowStartS: int
    pickupWindowEndS: int
    pickupServiceS: int
    dropoffLat: float
    dropoffLng: float
    dropoffDeadlineS: int
    dropoffServiceS: int
    capacityUnits: int = Field(ge=1)


class OptimizeRequest(BaseModel):
    jobId: str
    config: ConfigIn
    drivers: list[DriverIn]
    tasks: list[TaskIn]


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


def _unassigned_reason(task: TaskIn, drivers: list[DriverIn], has_capacity: bool) -> str:
    if not drivers:
        return NO_DRIVER_AVAILABLE
    overlaps = [
        d
        for d in drivers
        if d.shiftStartS <= task.dropoffDeadlineS and d.shiftEndS >= task.pickupWindowStartS
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
            service_s.append(task.dropoffServiceS)

        total_nodes = len(node_coords)
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

        def objective_distance_callback(from_index: int, to_index: int) -> int:
            distance_m = distance_callback(from_index, to_index)
            if distance_m <= 0:
                return 0
            return max(1, int(math.ceil(distance_m / 1000.0)))

        objective_distance_idx = routing.RegisterTransitCallback(objective_distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(objective_distance_idx)

        def time_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            travel = 0 if (not return_to_depot and node_kinds[to_node] == "depot_end") else time_matrix[from_node][to_node]
            return service_s[from_node] + travel

        time_idx = routing.RegisterTransitCallback(time_callback)
        max_shift_end = max(driver.shiftEndS for driver in drivers)
        max_task_time = max(
            [0]
            + [task.pickupWindowEndS for task in tasks]
            + [task.dropoffDeadlineS for task in tasks]
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
            time_dim.CumulVar(dropoff_index).SetRange(0, task.dropoffDeadlineS)

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

        routing.AddDimension(
            objective_distance_idx,
            0,
            10**12,
            True,
            "DistanceCost",
        )
        distance_cost_dim = routing.GetDimensionOrDie("DistanceCost")
        distance_cost_dim.SetGlobalSpanCostCoefficient(1)

        routing.AddDimension(
            distance_idx,
            0,
            10**12,
            True,
            "DistanceMeters",
        )
        distance_dim = routing.GetDimensionOrDie("DistanceMeters")

        for task_index, task in enumerate(tasks):
            pickup_index = manager.NodeToIndex(pickup_nodes[task_index])
            dropoff_index = manager.NodeToIndex(dropoff_nodes[task_index])
            routing.AddPickupAndDelivery(pickup_index, dropoff_index)
            solver.Add(routing.VehicleVar(pickup_index) == routing.VehicleVar(dropoff_index))
            solver.Add(time_dim.CumulVar(pickup_index) <= time_dim.CumulVar(dropoff_index))
            solver.Add(routing.ActiveVar(pickup_index) == routing.ActiveVar(dropoff_index))
            penalty = PRIORITY_PENALTIES.get(task.priority, PRIORITY_PENALTIES["normal"])
            pickup_penalty = penalty // 2
            dropoff_penalty = penalty - pickup_penalty
            routing.AddDisjunction([pickup_index], pickup_penalty)
            routing.AddDisjunction([dropoff_index], dropoff_penalty)

        search_params = pywrapcp.DefaultRoutingSearchParameters()
        search_params.time_limit.seconds = int(body.config.maxSolveSeconds)
        search_params.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
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
                        or _unassigned_reason(task, drivers, has_capacity_dimension),
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
                        else _unassigned_reason(task, drivers, has_capacity_dimension),
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
