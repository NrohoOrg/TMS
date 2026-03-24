# TMS Optimizer Guide

Comprehensive documentation on how the Optimizer service works, what parameters it takes, and how it functions.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Endpoints](#endpoints)
4. [Request Format](#request-format)
5. [Response Format](#response-format)
6. [How It Works](#how-it-works)
7. [Running the Optimizer](#running-the-optimizer)
8. [Integration with Backend](#integration-with-backend)

---

## Overview

The **Optimizer** is a Python microservice built with **FastAPI** that solves the Vehicle Routing Problem (VRP) using **Google OR-Tools**. It takes a set of tasks (delivery jobs) and drivers, and computes optimal routes that minimize distance while respecting time windows, driver shift times, and vehicle capacity constraints.

**Key Technology:**
- **Language:** Python 3
- **Framework:** FastAPI (lightweight REST API)
- **Solver:** Google OR-Tools (constraint programming library)
- **Port:** 8000
- **Health Check:** `GET /health` or `GET /optimizer/health`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Backend API (NestJS on port 3001)                           │
│  - Receives optimization request from dispatcher            │
│  - Sends to Optimizer via POST /optimize                    │
│  - Polls for results and stores in database                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ POST /api/dispatcher/planning/optimize
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Optimizer Service (Python FastAPI on port 8000)             │
│                                                              │
│  1. Receives optimization job request                        │
│  2. Parses drivers, tasks, and configuration                │
│  3. Builds constraint model:                                │
│     - Geographic distance matrix (Haversine formula)        │
│     - Time travel matrix                                     │
│     - Time window constraints                               │
│     - Vehicle capacity constraints                          │
│     - Pickup/delivery pairing constraints                   │
│  4. Configures OR-Tools solver with time limit              │
│  5. Solves the routing problem                              │
│  6. Returns optimized routes or unassigned tasks            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Response: routes + unassigned tasks
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend API (continues)                                      │
│  - Receives solution                                        │
│  - Creates Plan with routes                                │
│  - Stores in database                                       │
│  - Returns planId to dispatcher                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Endpoints

### 1. GET /health

**Purpose:** Basic health check (no auth needed)

**Response:**
```json
{
  "status": "ok",
  "service": "optimizer"
}
```

---

### 2. GET /optimizer/health

**Purpose:** Detailed health check (alternative endpoint)

**Response:**
```json
{
  "status": "ok",
  "service": "optimizer"
}
```

---

### 3. POST /optimize

**Purpose:** Solves a Vehicle Routing Problem instance

**Auth:** None (only called from backend API internally)

**Request Format:** See [Request Format](#request-format) section

**Response Format:** See [Response Format](#response-format) section

---

## Request Format

The `/optimize` endpoint expects a JSON request with the following structure:

```json
{
  "jobId": "e3f4a5b6-c7d8-9012-efab-234567890123",
  
  "config": {
    "maxSolveSeconds": 30,
    "speedKmh": 40.0,
    "returnToDepot": false
  },
  
  "drivers": [
    {
      "id": "driver-uuid-1",
      "shiftStartS": 28800,
      "shiftEndS": 61200,
      "depotLat": 36.7372,
      "depotLng": 3.0865,
      "capacityUnits": 10
    }
  ],
  
  "tasks": [
    {
      "id": "task-uuid-1",
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
}
```

### Parameter Definitions

#### `config` Object
| Field | Type | Range | Default | Description |
|-------|------|-------|---------|-------------|
| `maxSolveSeconds` | int | ≥ 1 | 30 | Maximum time the solver will spend optimizing. Longer = better solution but higher latency. |
| `speedKmh` | float | > 0 | 40 | Assumed average vehicle speed (km/h). Used to convert distances to travel times. |
| `returnToDepot` | bool | - | false | If true, drivers must return to their home depot after last delivery. If false, they can end anywhere. |

#### `drivers` Array
Each driver object:

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `id` | string | - | UUID of the driver |
| `shiftStartS` | int | 0-86400 | Driver's shift start time in seconds since midnight (UTC). E.g., 28800 = 8:00 AM |
| `shiftEndS` | int | 0-86400 | Driver's shift end time in seconds since midnight (UTC). E.g., 61200 = 5:00 PM |
| `depotLat` | float | -90 to 90 | Driver's home depot latitude (WGS84) |
| `depotLng` | float | -180 to 180 | Driver's home depot longitude (WGS84) |
| `capacityUnits` | int or null | ≥ 1 | Max cargo units this driver can carry. `null` = unlimited capacity |

**Note:** All time fields (`shiftStartS`, `shiftEndS`, `pickupWindowStartS`, etc.) are in **seconds since midnight (00:00:00 UTC)**, not Unix timestamps. For example:
- 8:00 AM = 28,800 seconds (8 × 3600)
- 5:00 PM = 61,200 seconds (17 × 3600)

#### `tasks` Array
Each task (delivery job) object:

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `id` | string | - | UUID of the task |
| `priority` | string | "low" \| "normal" \| "high" \| "urgent" | Task priority. Higher priority tasks are more likely to be assigned. |
| `pickupLat` | float | -90 to 90 | Pickup location latitude (WGS84) |
| `pickupLng` | float | -180 to 180 | Pickup location longitude (WGS84) |
| `pickupWindowStartS` | int | 0-86400 | Earliest allowed pickup time (seconds since midnight) |
| `pickupWindowEndS` | int | 0-86400 | Latest allowed pickup time (seconds since midnight) |
| `pickupServiceS` | int | ≥ 0 | Time spent at pickup location (seconds). E.g., 600 = 10 minutes |
| `dropoffLat` | float | -90 to 90 | Delivery location latitude (WGS84) |
| `dropoffLng` | float | -180 to 180 | Delivery location longitude (WGS84) |
| `dropoffDeadlineS` | int | 0-86400 | Hard deadline for delivery (seconds since midnight). Delivery must complete by this time. |
| `dropoffServiceS` | int | ≥ 0 | Time spent at delivery location (seconds). E.g., 300 = 5 minutes |
| `capacityUnits` | int | ≥ 1 | Cargo units consumed by this task. Must be ≤ driver's capacity. |

---

## Response Format

The `/optimize` endpoint always returns with HTTP 200, even on "failure" (timeout or infeasibility). The `status` field indicates the outcome:

```json
{
  "jobId": "e3f4a5b6-c7d8-9012-efab-234567890123",
  "status": "completed",
  "routes": [
    {
      "driverId": "driver-uuid-1",
      "stops": [
        {
          "taskId": "task-uuid-1",
          "type": "pickup",
          "sequence": 1,
          "arrivalS": 32400,
          "departureS": 33000
        },
        {
          "taskId": "task-uuid-1",
          "type": "dropoff",
          "sequence": 2,
          "arrivalS": 36200,
          "departureS": 36500
        }
      ],
      "totalDistanceM": 38500,
      "totalTimeS": 8100
    }
  ],
  "unassigned": [
    {
      "taskId": "task-uuid-2",
      "reason": "TIME_WINDOW_INFEASIBLE"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `jobId` | string | Echo of the request `jobId` for tracking |
| `status` | string | "completed" \| "failed" — Always "completed" unless there was a server error. Even when tasks can't be assigned, status is "completed". |
| `routes` | array | List of optimized routes (one per driver assigned tasks) |
| `unassigned` | array | List of tasks that could not be assigned to any driver, with reason codes |

### Route Object

| Field | Type | Description |
|-------|------|-------------|
| `driverId` | string | UUID of the driver |
| `stops` | array | Ordered list of pickup/delivery stops for this driver |
| `totalDistanceM` | int | Total distance driven (meters) |
| `totalTimeS` | int | Total time on route (seconds) including travel and service times |

### Stop Object

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | string | UUID of the task this stop belongs to |
| `type` | string | "pickup" \| "dropoff" — Whether this is a pickup or delivery stop |
| `sequence` | int | Order in the route (1-based) |
| `arrivalS` | int | Estimated arrival time (seconds since midnight) |
| `departureS` | int | Estimated departure time (seconds since midnight) = `arrivalS + service_time` |

### Unassigned Task Reason Codes

| Code | Meaning |
|------|---------|
| `NO_DRIVER_AVAILABLE` | No drivers exist, or no driver can serve this task's time window. |
| `TIME_WINDOW_INFEASIBLE` | All available drivers have shift times that conflict with the task's pickup/delivery windows. |
| `CAPACITY_EXCEEDED` | All drivers with capacity constraints have insufficient capacity for this task. |
| `SOLVER_TIMEOUT` | The solver timed out before finding a feasible solution. Increase `maxSolveSeconds` to retry. |

---

## How It Works

### Step 1: Build the Network

The optimizer constructs a directed graph where nodes represent:
- **Depot nodes:** Each driver's home location (start and end)
- **Pickup nodes:** One for each task's pickup location
- **Delivery nodes:** One for each task's dropoff location

For each pair of nodes, it calculates:
1. **Distance** (meters) using the Haversine formula on WGS84 coordinates
2. **Travel time** (seconds) = distance / speed

### Step 2: Add Constraints

The model enforces:

#### Time Window Constraints
- Pickup must occur within `[pickupWindowStartS, pickupWindowEndS]`
- Delivery must complete by `dropoffDeadlineS`
- Driver must stay within shift hours `[shiftStartS, shiftEndS]`

#### Pairing Constraints
- Pickup and delivery of the same task **must** be on the same driver's route
- Pickup must come **before** delivery

#### Capacity Constraints (if any driver has `capacityUnits != null`)
- Load picked up at a pickup node and dropped off at delivery node
- Running capacity on each route must never exceed the driver's limit

#### Service Time Constraints
- At each stop, the driver spends `pickupServiceS` or `dropoffServiceS` seconds

#### Return-to-Depot Constraint (if `returnToDepot = true`)
- Each driver's route must end at their depot
- If `false`, drivers can end anywhere

### Step 3: Objective Function

The solver minimizes:
1. **Distance Cost:** Total kilometers driven (scaled cost)
2. **Unassigned Penalty:** Each unassigned task incurs a penalty based on priority:
   - `urgent`: 1000 penalty points
   - `high`: 500 penalty points
   - `normal`: 100 penalty points
   - `low`: 10 penalty points

Tasks with higher priority are more likely to be assigned.

### Step 4: Solve

The solver uses:
- **First Solution Strategy:** `PATH_CHEAPEST_ARC` — Start with a greedy solution
- **Local Search:** `GUIDED_LOCAL_SEARCH` — Iteratively improve the solution
- **Time Limit:** Respect `maxSolveSeconds`

### Step 5: Extract Results

1. For each driver, trace the optimized route
2. For each stop visited, record task ID, type (pickup/dropoff), sequence, and ETA
3. Identify tasks not routed (their reason code)
4. Calculate total distance and time per route

---

## Running the Optimizer

### Development Setup

```bash
# 1. Navigate to optimizer directory
cd apps/optimizer

# 2. Create a Python virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Using Docker (from docker-compose.yml)

```bash
# From root directory, start just the optimizer
docker-compose up -d optimizer

# Or build and run manually
docker build -t tms-optimizer ./apps/optimizer
docker run -p 8000:8000 tms-optimizer
```

### Using nx (Nx monorepo)

```bash
# From root directory
npx nx run optimizer:serve

# Or with pnpm
pnpm nx run optimizer:serve
```

### Health Check

Once running:
```bash
curl http://localhost:8000/health
# Response: {"status": "ok", "service": "optimizer"}
```

---

## Integration with Backend

### Full Flow

1. **Dispatcher initiates optimization:**
   ```bash
   POST http://localhost:3001/api/dispatcher/planning/optimize
   {
     "date": "2026-03-08",
     "returnToDepot": true
   }
   ```

2. **Backend processes the request:**
   - Fetches all `pending` tasks for that date
   - Fetches all active drivers
   - Loads global config (`maxSolveSeconds`, `speedKmh`)
   - Converts database records to optimizer format:
     - Converts datetime strings to seconds-since-midnight
     - Converts driver minutes to seconds
     - Assembles the `OptimizeRequest` JSON

3. **Backend calls optimizer:**
   ```bash
   POST http://optimizer:8000/optimize
   {
     "jobId": "...",
     "config": {...},
     "drivers": [...],
     "tasks": [...]
   }
   ```

4. **Optimizer solves and returns immediately**
   - Even if solution is partial (some tasks unassigned)

5. **Backend processes the solution:**
   - Creates a `Plan` record with status `draft`
   - Creates `Route` records for each driver route
   - Creates `Stop` records for each stop
   - Marks unassigned tasks in a separate data structure

6. **Dispatcher reviews the plan:**
   - Lists unassigned tasks and their reasons
   - Can manually adjust if needed
   - Reviews routes for feasibility

7. **Dispatcher publishes the plan:**
   - Plan status changes to `published`
   - Drivers receive their routes in the driver app

---

## Example: Complete Optimization Request/Response

### Request

```bash
curl -X POST http://localhost:8000/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job-123",
    "config": {
      "maxSolveSeconds": 30,
      "speedKmh": 40,
      "returnToDepot": true
    },
    "drivers": [
      {
        "id": "driver-1",
        "shiftStartS": 28800,
        "shiftEndS": 61200,
        "depotLat": 36.7372,
        "depotLng": 3.0865,
        "capacityUnits": null
      }
    ],
    "tasks": [
      {
        "id": "task-1",
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
      },
      {
        "id": "task-2",
        "priority": "urgent",
        "pickupLat": 36.7,
        "pickupLng": 3.15,
        "pickupWindowStartS": 32400,
        "pickupWindowEndS": 36000,
        "pickupServiceS": 300,
        "dropoffLat": 36.85,
        "dropoffLng": 3.12,
        "dropoffDeadlineS": 48600,
        "dropoffServiceS": 300,
        "capacityUnits": 1
      }
    ]
  }'
```

### Response

```json
{
  "jobId": "job-123",
  "status": "completed",
  "routes": [
    {
      "driverId": "driver-1",
      "stops": [
        {
          "taskId": "task-2",
          "type": "pickup",
          "sequence": 1,
          "arrivalS": 34200,
          "departureS": 34500
        },
        {
          "taskId": "task-2",
          "type": "dropoff",
          "sequence": 2,
          "arrivalS": 37200,
          "departureS": 37500
        },
        {
          "taskId": "task-1",
          "type": "pickup",
          "sequence": 3,
          "arrivalS": 38100,
          "departureS": 38700
        },
        {
          "taskId": "task-1",
          "type": "dropoff",
          "sequence": 4,
          "arrivalS": 42300,
          "departureS": 42600
        }
      ],
      "totalDistanceM": 25000,
      "totalTimeS": 14400
    }
  ],
  "unassigned": []
}
```

### Interpretation

- Driver 1 picks up task-2 at 09:30 (34200s), delivers by 10:45 (37500s)
- Driver 1 then picks up task-1 at 10:35 (38100s), delivers by 11:50 (42600s)
- Total route: ~25 km and ~4 hours
- Both tasks assigned — `unassigned` array is empty

---

## Troubleshooting

### Optimizer won't start

**Error:** `ModuleNotFoundError: No module named 'ortools'`

**Solution:**
```bash
cd apps/optimizer
pip install -r requirements.txt
```

### All tasks unassigned with `TIME_WINDOW_INFEASIBLE`

**Cause:** Driver shift times don't overlap with task time windows

**Solution:**
- Extend driver shifts
- Adjust task pickup/delivery windows
- Check time format (ensure in seconds-since-midnight, not Unix timestamp)

### Solver timeout

**Error:** `SOLVER_TIMEOUT` for all or some tasks

**Cause:** Problem is complex and solver ran out of time

**Solution:**
- Increase `maxSolveSeconds` (at the cost of latency)
- Split into smaller optimization batches (fewer tasks/drivers per job)
- Reduce precision of config (e.g., `speedKmh` can use round numbers)

### Unexpected route order

**Cause:** Optimizer chose a different order than expected

**Explanation:** Optimizer is free to reorder stops as long as all constraints are satisfied. The order may not be intuitive if you're looking at raw coordinates.

**Validation:** Check that:
- Pickup comes before dropoff for each task
- All time windows are respected
- Capacity limits aren't violated
- Total time fits within the shift

---

## Performance Tips

1. **Increase `maxSolveSeconds`** for complex instances (many tasks/drivers) to get better solutions
2. **Set realistic `speedKmh`** — it affects ETA calculations and feasibility checks
3. **Use `returnToDepot = false`** when possible — simplifies the problem
4. **Batch optimization** — split large daily batches into regional sub-batches
5. **Set `capacityUnits = null`** if you don't use capacity constraints — reduces solver complexity

---

## Further References

- [Google OR-Tools Documentation](https://developers.google.com/optimization/routing)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
