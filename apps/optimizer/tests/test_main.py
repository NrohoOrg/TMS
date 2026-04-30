from copy import deepcopy
from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


client = TestClient(app)


def _base_payload() -> dict:
    return {
        "jobId": "job-1",
        "config": {
            "maxSolveSeconds": 5,
            "speedKmh": 50,
            "returnToDepot": False,
            "dropoffWithinSeconds": 7200,
        },
        "drivers": [
            {
                "id": "driver-1",
                "shiftStartS": 28800,
                "shiftEndS": 61200,
                "depotLat": 36.7372,
                "depotLng": 3.0865,
                "capacityUnits": None,
            }
        ],
        "tasks": [
            {
                "id": "task-1",
                "priority": "urgent",
                "pickupLat": 36.74,
                "pickupLng": 3.09,
                "pickupWindowStartS": 30000,
                "pickupWindowEndS": 36000,
                "pickupServiceS": 300,
                "dropoffLat": 36.742,
                "dropoffLng": 3.095,
                "capacityUnits": 1,
            }
        ],
    }


def test_health_returns_200() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "optimizer"}


def test_optimize_simple_returns_routes() -> None:
    response = client.post("/optimize", json=_base_payload())
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["routes"]
    assert any(route["stops"] for route in data["routes"])
    assert data["unassigned"] == []


def test_infeasible_window_returns_time_window_reason() -> None:
    payload = deepcopy(_base_payload())
    payload["drivers"][0]["shiftStartS"] = 0
    payload["drivers"][0]["shiftEndS"] = 100
    payload["tasks"][0]["pickupWindowStartS"] = 200
    payload["tasks"][0]["pickupWindowEndS"] = 250

    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert any(
        item["taskId"] == "task-1" and item["reason"] == "TIME_WINDOW_INFEASIBLE"
        for item in data["unassigned"]
    )


def test_dropoff_service_seconds_propagate() -> None:
    """Dropoff service time, sent via config, must show up in stop ETAs."""
    payload = deepcopy(_base_payload())
    payload["config"]["dropoffServiceSeconds"] = 600

    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    route = data["routes"][0]
    pickup_stop = next(s for s in route["stops"] if s["type"] == "pickup")
    dropoff_stop = next(s for s in route["stops"] if s["type"] == "dropoff")
    assert dropoff_stop["arrivalS"] >= pickup_stop["departureS"]


def test_urgent_penalty_dwarfs_arc_cost() -> None:
    """An urgent task far from depot must still be assigned: the default
    5000 DZD (5e9 μDZD) penalty dwarfs a ~30 km arc (~8.5e7 μDZD)."""
    payload = deepcopy(_base_payload())
    payload["tasks"][0]["priority"] = "urgent"
    payload["tasks"][0]["pickupLat"] = 36.95
    payload["tasks"][0]["pickupLng"] = 3.30
    payload["tasks"][0]["dropoffLat"] = 36.96
    payload["tasks"][0]["dropoffLng"] = 3.31
    payload["tasks"][0]["pickupWindowStartS"] = 30000
    payload["tasks"][0]["pickupWindowEndS"] = 50000
    payload["drivers"][0]["shiftEndS"] = 65000

    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["unassigned"] == []


def _carpool_payload() -> dict:
    """Three tasks with identical pickup coords, identical dropoff coords,
    and a narrow shared pickup window (08:00–08:30). Single driver with
    capacity 4 and depot at the pickup."""
    pickup_lat, pickup_lng = 36.7372, 3.0865
    dropoff_lat, dropoff_lng = 36.7300, 2.9900
    return {
        "jobId": "job-carpool",
        "config": {
            "maxSolveSeconds": 5,
            "speedKmh": 50,
            "returnToDepot": False,
            "dropoffWithinSeconds": 7200,
            "colocatedMarginalServiceSeconds": 60,
        },
        "drivers": [
            {
                "id": "driver-1",
                "shiftStartS": 28800,
                "shiftEndS": 61200,
                "depotLat": pickup_lat,
                "depotLng": pickup_lng,
                "capacityUnits": 4,
            }
        ],
        "tasks": [
            {
                "id": f"task-{i}",
                "priority": "normal",
                "pickupLat": pickup_lat,
                "pickupLng": pickup_lng,
                "pickupWindowStartS": 28800,  # 08:00
                "pickupWindowEndS": 30600,  # 08:30 — narrow on purpose
                "pickupServiceS": 1200,  # 20 min full service
                "dropoffLat": dropoff_lat,
                "dropoffLng": dropoff_lng,
                "capacityUnits": 1,
            }
            for i in range(1, 4)
        ],
    }


def test_carpool_three_same_address_fit_one_driver() -> None:
    """With marginal service collapse, 3 riders boarding at the same
    address inside a 30-min window all assign to the same driver."""
    response = client.post("/optimize", json=_carpool_payload())
    assert response.status_code == 200
    data = response.json()
    assert data["unassigned"] == [], (
        f"Expected all carpool tasks assigned, got: {data['unassigned']}"
    )
    assert len(data["routes"]) == 1
    pickups = [s for s in data["routes"][0]["stops"] if s["type"] == "pickup"]
    dropoffs = [s for s in data["routes"][0]["stops"] if s["type"] == "dropoff"]
    assert len(pickups) == 3
    assert len(dropoffs) == 3
    # All three pickup arrivals fit inside the 30-min window.
    for stop in pickups:
        assert 28800 <= stop["arrivalS"] <= 30600


def test_carpool_without_marginal_collapse_reproduces_original_drop() -> None:
    """Sanity-check the feature against the bug it was built to fix:
    with the marginal knob disabled, 20-min pickups stack so only the
    first two fit inside the 30-min window — and the third is dropped.
    This mirrors the dispatcher screenshot that motivated this branch
    (Badri picks 2, Amel is left unassigned)."""
    payload = _carpool_payload()
    payload["config"]["colocatedMarginalServiceSeconds"] = 1200  # = full

    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["unassigned"]) == 1
    assert data["unassigned"][0]["taskId"] == "task-3"


def test_carpool_keeps_nearby_extra_task_on_same_driver() -> None:
    """Reproduces the dispatcher report: when a 4th task whose pickup is a
    few kilometres from a colocated cluster of 3 is added, the load-balancer
    must not shove it onto a driver already busy on the other side of the
    city. Distinct-cluster fairness counts the colocated trio as one stop,
    so the cluster handler still has spare 'fairness budget' to absorb the
    extra task.

    Setup: D1 sits next to the cluster origin and is otherwise idle. D2 is
    busy with two anchored tasks across town. The 4th task is a few km
    from the cluster, time-overlapping. Expected: D1 takes all 4 cluster-
    related tasks; D2 keeps its own pair.
    """
    cluster_pickup = (36.7200, 3.2500)   # Bab Ezzouar-ish
    cluster_dropoff = (36.6900, 2.9300)  # Mahelma-ish
    near_cluster_pickup = (36.7220, 3.2530)
    near_cluster_dropoff = (36.6920, 2.9320)
    east_pickup = (36.7370, 3.2200)      # D2's anchor pickup 1
    east_dropoff = (36.7100, 2.9200)     # D2's anchor dropoff (Zeralda-ish)

    payload = {
        "jobId": "job-fairness",
        "config": {
            "maxSolveSeconds": 5,
            "speedKmh": 50,
            "returnToDepot": False,
            "dropoffWithinSeconds": 7200,
            "colocatedMarginalServiceSeconds": 60,
            # Worst-case fairness lever: use the production default × 4 to
            # prove the new behaviour holds even under aggressive balancing.
            "loadBalancingDzdPerTask": 200,
        },
        "drivers": [
            {
                "id": "D1-cluster-side",
                "shiftStartS": 28800,
                "shiftEndS": 61200,
                "depotLat": cluster_pickup[0],
                "depotLng": cluster_pickup[1],
                "capacityUnits": 4,
            },
            {
                "id": "D2-busy-east",
                "shiftStartS": 28800,
                "shiftEndS": 61200,
                "depotLat": east_pickup[0],
                "depotLng": east_pickup[1],
                "capacityUnits": 4,
            },
        ],
        "tasks": [
            # Three colocated cluster tasks (08:00 window).
            *[
                {
                    "id": f"cluster-{i}",
                    "priority": "normal",
                    "pickupLat": cluster_pickup[0],
                    "pickupLng": cluster_pickup[1],
                    "pickupWindowStartS": 28800,
                    "pickupWindowEndS": 30600,
                    "pickupServiceS": 1200,
                    "dropoffLat": cluster_dropoff[0],
                    "dropoffLng": cluster_dropoff[1],
                    "capacityUnits": 1,
                }
                for i in range(1, 4)
            ],
            # Near-but-not-colocated 4th task, same time window.
            {
                "id": "cluster-near",
                "priority": "normal",
                "pickupLat": near_cluster_pickup[0],
                "pickupLng": near_cluster_pickup[1],
                "pickupWindowStartS": 28800,
                "pickupWindowEndS": 30600,
                "pickupServiceS": 1200,
                "dropoffLat": near_cluster_dropoff[0],
                "dropoffLng": near_cluster_dropoff[1],
                "capacityUnits": 1,
            },
            # D2 anchors: pickup near D2's depot, dropoff west — forces D2
            # across the city and far away from the cluster.
            {
                "id": "anchor-1",
                "priority": "normal",
                "pickupLat": east_pickup[0],
                "pickupLng": east_pickup[1],
                "pickupWindowStartS": 28800,
                "pickupWindowEndS": 30600,
                "pickupServiceS": 600,
                "dropoffLat": east_dropoff[0],
                "dropoffLng": east_dropoff[1],
                "capacityUnits": 1,
            },
            {
                "id": "anchor-2",
                "priority": "normal",
                "pickupLat": east_pickup[0],
                "pickupLng": east_pickup[1],
                "pickupWindowStartS": 28800,
                "pickupWindowEndS": 30600,
                "pickupServiceS": 600,
                "dropoffLat": east_dropoff[0],
                "dropoffLng": east_dropoff[1],
                "capacityUnits": 1,
            },
        ],
    }

    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["unassigned"] == [], f"Unexpected unassigned: {data['unassigned']}"

    routes_by_driver = {r["driverId"]: r for r in data["routes"]}
    d1_task_ids = {
        s["taskId"] for s in routes_by_driver["D1-cluster-side"]["stops"]
        if s["type"] == "pickup"
    }
    d2_task_ids = {
        s["taskId"] for s in routes_by_driver["D2-busy-east"]["stops"]
        if s["type"] == "pickup"
    }
    cluster_ids = {"cluster-1", "cluster-2", "cluster-3", "cluster-near"}
    assert cluster_ids.issubset(d1_task_ids), (
        f"Expected all cluster + near tasks on D1, got D1={d1_task_ids}, D2={d2_task_ids}"
    )
    assert cluster_ids.isdisjoint(d2_task_ids)


def test_normal_penalty_below_arc_cost_drops_task() -> None:
    """If the normal-task penalty is set below the marginal fuel cost of
    the detour, the optimizer should leave the task unassigned."""
    payload = deepcopy(_base_payload())
    payload["tasks"][0]["priority"] = "normal"
    payload["tasks"][0]["pickupLat"] = 36.95
    payload["tasks"][0]["pickupLng"] = 3.30
    payload["tasks"][0]["dropoffLat"] = 36.96
    payload["tasks"][0]["dropoffLng"] = 3.31
    payload["config"]["unassignedPenaltyNormalDzd"] = 1
    payload["config"]["unassignedPenaltyUrgentDzd"] = 1

    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert any(item["taskId"] == "task-1" for item in data["unassigned"])
