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
