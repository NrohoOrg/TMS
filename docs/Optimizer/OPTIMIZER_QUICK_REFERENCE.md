# Optimizer Quick Reference

Quick visual summary of the Optimizer service.

---

## 🚀 Quick Start

### Start the Optimizer
```bash
cd apps/optimizer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Health Check
```bash
curl http://localhost:8000/health
```

---

## 📋 What It Does

Solves the **Vehicle Routing Problem (VRP)**:
- Takes: drivers, tasks (deliveries), time constraints, capacity limits
- Produces: optimized routes that minimize distance/time while respecting all constraints
- Returns: routes for drivers + list of unassigned tasks (with reasons why)

---

## 🔧 Parameters Explained

### Configuration (`config`)

```
maxSolveSeconds: 30    ← How long to spend optimizing (sec)
                         Higher = better solution, slower response

speedKmh: 40.0         ← Assumed average vehicle speed
                         Used to convert distance → time

returnToDepot: false   ← Must drivers return to home depot?
                         true = yes, false = can end anywhere
```

### Driver

```
id: "uuid"
shiftStartS: 28800     ← Start time in seconds since midnight
                         28800 = 8:00 AM (8 × 3600)
shiftEndS: 61200       ← End time in seconds since midnight
                         61200 = 5:00 PM (17 × 3600)
depotLat: 36.7372      ← Home depot latitude
depotLng: 3.0865       ← Home depot longitude
capacityUnits: 10      ← Max cargo units (null = unlimited)
```

### Task

```
id: "uuid"
priority: "normal"     ← low | normal | high | urgent
                         Higher priority → more likely assigned

pickupLat/Lng: 36.75   ← Pickup location coordinates
pickupWindowStartS: 32400   ← Earliest pickup (seconds since midnight)
pickupWindowEndS: 36000     ← Latest pickup (seconds since midnight)
pickupServiceS: 600        ← Time at pickup (seconds = minutes × 60)

dropoffLat/Lng: 36.80  ← Delivery location coordinates
dropoffDeadlineS: 50400    ← Must deliver by this time (sec since midnight)
dropoffServiceS: 300      ← Time at delivery location (seconds)

capacityUnits: 1       ← Cargo units consumed (must be ≤ driver capacity)
```

---

## 📤 Response Format

### Routes (Assigned)

```json
{
  "driverId": "uuid",
  "stops": [
    {
      "taskId": "uuid",
      "type": "pickup",        ← or "dropoff"
      "sequence": 1,           ← Order on route (1st, 2nd, etc)
      "arrivalS": 32400,       ← When driver arrives (sec since midnight)
      "departureS": 33000      ← When driver leaves (after service)
    }
  ],
  "totalDistanceM": 25000,     ← Distance in meters
  "totalTimeS": 14400          ← Time in seconds
}
```

### Unassigned (Not Assigned)

```json
{
  "taskId": "uuid",
  "reason": "TIME_WINDOW_INFEASIBLE"  ← Why it wasn't assigned
}
```

#### Unassigned Reason Codes

| Code | Meaning |
|------|---------|
| `NO_DRIVER_AVAILABLE` | No drivers exist or none can serve this task |
| `TIME_WINDOW_INFEASIBLE` | Driver shifts don't overlap with task windows |
| `CAPACITY_EXCEEDED` | All drivers lack capacity for this task |
| `SOLVER_TIMEOUT` | Solver ran out of time (increase `maxSolveSeconds`) |

---

## ⏰ Time Format Cheat Sheet

All times are **seconds since midnight (00:00:00)**, not Unix timestamps.

| Time | Seconds | Calculation |
|------|---------|-------------|
| 12:00 AM (midnight) | 0 | 0 × 3600 |
| 6:00 AM | 21600 | 6 × 3600 |
| 8:00 AM | 28800 | 8 × 3600 |
| 12:00 PM (noon) | 43200 | 12 × 3600 |
| 2:00 PM | 50400 | 14 × 3600 |
| 5:00 PM | 61200 | 17 × 3600 |
| 11:59 PM | 86340 | 23.99 × 3600 |

**Formula:** `hours × 3600 + minutes × 60 + seconds`

---

## 🎯 How It Solves the Problem

```
1. Build Network
   ├─ Depot nodes (start & end for each driver)
   ├─ Pickup nodes (one per task)
   └─ Delivery nodes (one per task)

2. Calculate Distances & Times
   └─ Haversine formula on WGS84 coordinates
   └─ Travel time = distance / speedKmh

3. Add Constraints
   ├─ Time windows (pickup, delivery, shifts)
   ├─ Pairing (pickup → delivery on same driver)
   ├─ Capacity (load ≤ driver capacity)
   ├─ Service times (wait at stop)
   └─ Return to depot (if enabled)

4. Optimize
   ├─ Minimize: distance + unassigned penalties
   ├─ Strategy: PATH_CHEAPEST_ARC + GUIDED_LOCAL_SEARCH
   └─ Respect: maxSolveSeconds time limit

5. Extract Results
   ├─ Assigned routes (one per active driver)
   ├─ Unassigned tasks + reasons
   └─ Total distance & time per route
```

---

## 🔄 Request/Response Cycle

```
┌─ Backend (API) ─────────────────────────────────┐
│ Dispatcher clicks "Optimize"                    │
│                                                 │
│ GET tasks for date → Convert to optimizer fmt  │
│ GET drivers → Convert to optimizer fmt         │
│ GET config → Include speedKmh, timeout         │
│                                                 │
│ POST http://optimizer:8000/optimize            │
│          ↓                                      │
├─ Optimizer (Python) ────────────────────────────┤
│ Parse request                                   │
│ Build routing model (OR-Tools)                 │
│ Run solver (up to maxSolveSeconds)             │
│ Extract routes & unassigned                    │
│                                                 │
│ RETURN { routes, unassigned }                  │
│          ↑                                      │
├─ Backend (API) ─────────────────────────────────┤
│ Store Plan (draft)                             │
│ Store Routes & Stops                           │
│ Mark tasks as assigned/unassigned              │
│                                                 │
│ Dispatcher sees plan + unassigned list         │
│ Can review and publish plan to drivers         │
└─────────────────────────────────────────────────┘
```

---

## 💡 Common Issues & Solutions

### Issue: All tasks `TIME_WINDOW_INFEASIBLE`

**Cause:** Driver shifts don't overlap with task pickup times

**Fix:**
- Make driver shifts longer
- Relax task pickup windows
- Check time format (must be seconds-since-midnight)

### Issue: Some tasks `CAPACITY_EXCEEDED`

**Cause:** Tasks too large for any driver's capacity

**Fix:**
- Increase driver capacities
- Set `capacityUnits = null` if not needed
- Split large tasks into smaller ones

### Issue: Timeout (tasks marked `SOLVER_TIMEOUT`)

**Cause:** Problem too complex to solve in time limit

**Fix:**
- Increase `maxSolveSeconds` (0.5 to 60 sec typical)
- Reduce number of tasks per optimization run
- Simplify problem (fewer drivers, remove capacity constraint)

### Issue: Strange route order

**Cause:** Optimizer reordered stops for efficiency

**Validation:** Just check:
- Pickup before delivery for each task ✓
- Time windows respected ✓
- Capacity not exceeded ✓
- Within driver shift ✓

---

## 🧪 Testing

### Test Request (curl)

```bash
curl -X POST http://localhost:8000/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-1",
    "config": {
      "maxSolveSeconds": 30,
      "speedKmh": 40,
      "returnToDepot": false
    },
    "drivers": [
      {
        "id": "d1",
        "shiftStartS": 28800,
        "shiftEndS": 61200,
        "depotLat": 36.7,
        "depotLng": 3.0,
        "capacityUnits": null
      }
    ],
    "tasks": [
      {
        "id": "t1",
        "priority": "normal",
        "pickupLat": 36.75,
        "pickupLng": 3.05,
        "pickupWindowStartS": 32400,
        "pickupWindowEndS": 36000,
        "pickupServiceS": 600,
        "dropoffLat": 36.80,
        "dropoffLng": 3.10,
        "dropoffDeadlineS": 50400,
        "dropoffServiceS": 300,
        "capacityUnits": 1
      }
    ]
  }'
```

### Expected Response

```json
{
  "jobId": "test-1",
  "status": "completed",
  "routes": [
    {
      "driverId": "d1",
      "stops": [
        {
          "taskId": "t1",
          "type": "pickup",
          "sequence": 1,
          "arrivalS": 33600,
          "departureS": 34200
        },
        {
          "taskId": "t1",
          "type": "dropoff",
          "sequence": 2,
          "arrivalS": 37800,
          "departureS": 38100
        }
      ],
      "totalDistanceM": 12345,
      "totalTimeS": 4500
    }
  ],
  "unassigned": []
}
```

---

## 📚 Dependencies

| Library | Purpose |
|---------|---------|
| FastAPI | REST API framework |
| Uvicorn | ASGI web server |
| OR-Tools | Constraint solver for VRP |
| Pydantic | Data validation |
| Pytest | Testing |

---

## 🎓 Learn More

See `OPTIMIZER_GUIDE.md` for detailed documentation.
