# Optimizer Architecture Diagrams

Visual explanations of how the Optimizer works.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Dispatcher (Frontend)                          │
│  User clicks "Optimize for March 8"                                  │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
                    POST /api/dispatcher/planning/optimize
                    { date: "2026-03-08" }
                              │
┌──────────────────────────────┴──────────────────────────────────────┐
│                    Backend API (NestJS, port 3001)                   │
│                                                                      │
│  1. Find all PENDING tasks for March 8                              │
│  2. Find all ACTIVE drivers                                         │
│  3. Get system config (speedKmh, maxSolveSeconds, etc)             │
│  4. Convert to Optimizer format                                     │
│     - Convert datetime → seconds-since-midnight                     │
│     - Convert db records → JSON                                     │
│                                                                      │
│  5. Call POST /optimize on Optimizer service                        │
└──────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
            POST http://optimizer:8000/optimize
            {
              jobId: "...",
              config: {...},
              drivers: [{...}],
              tasks: [{...}]
            }
                              │
┌──────────────────────────────┴──────────────────────────────────────┐
│                  Optimizer (Python, port 8000)                       │
│                                                                      │
│  🧠 CONSTRAINT PROGRAMMING SOLVER                                    │
│                                                                      │
│  Input: drivers + tasks + constraints                               │
│  Process: Build graph → Apply constraints → Solve → Extract result  │
│  Output: routes + unassigned                                        │
│                                                                      │
│  (See detailed flow below)                                          │
└──────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
            RETURN {
              status: "completed",
              routes: [...],
              unassigned: [...]
            }
                              │
┌──────────────────────────────┴──────────────────────────────────────┐
│                    Backend API (NestJS, port 3001)                   │
│                                                                      │
│  6. Create Plan record (status: "draft")                            │
│  7. Create Route records (one per driver with tasks)                │
│  8. Create Stop records (one per pickup/delivery)                   │
│  9. Mark unassigned tasks + reasons                                 │
│  10. Return planId to dispatcher                                    │
└──────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
                  Dispatcher reviews plan
              Can see routes + unassigned tasks
                  Can publish to drivers
```

---

## Optimizer Internal Flow

```
START: POST /optimize received
  ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. PARSE & VALIDATE                                         │
│    - Check jobId exists                                     │
│    - Validate config (maxSolveSeconds, speedKmh)            │
│    - Validate drivers array                                 │
│    - Validate tasks array                                   │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BUILD NETWORK GRAPH                                      │
│                                                              │
│    Nodes:                                                   │
│    ┌─ Depot Start (one per driver)                         │
│    ├─ Pickup nodes (one per task)                          │
│    ├─ Dropoff nodes (one per task)                         │
│    └─ Depot End (one per driver)                           │
│                                                              │
│    Edges:                                                   │
│    └─ Between all pairs of nodes                           │
│                                                              │
│    Edge Costs:                                              │
│    └─ Distance (Haversine) + Travel Time                   │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CALCULATE DISTANCE & TIME MATRICES                       │
│                                                              │
│    For each pair of locations (i, j):                       │
│    ├─ Haversine distance in meters                          │
│    │  Formula: R × 2 × atan2(√a, √(1-a))                  │
│    │  where: a = sin²(Δlat/2) + cos(lat1)×cos(lat2)×sin²(Δlon/2)     │
│    │                                                        │
│    └─ Travel time in seconds                               │
│       = distance_m / (speedKmh × 1000/3600)               │
│                                                              │
│    Result: Two (N×N) matrices where N = total nodes        │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SET UP OR-TOOLS ROUTING MODEL                            │
│                                                              │
│    routing = RoutingIndexManager(                           │
│      total_nodes=N,                                         │
│      num_vehicles=num_drivers,                              │
│      starts=[depot_start indices],                          │
│      ends=[depot_end indices]                               │
│    )                                                         │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ADD CONSTRAINTS                                          │
│                                                              │
│    Time Constraints:                                        │
│    ├─ Pickup must be in [pickupWindowStartS, pickupWindowEndS]     │
│    ├─ Dropoff must complete by dropoffDeadlineS            │
│    ├─ Each driver's shift: [shiftStartS, shiftEndS]       │
│    └─ Service times at each stop                           │
│                                                              │
│    Capacity Constraints (if any driver.capacityUnits):     │
│    ├─ Load picked at pickup node                           │
│    ├─ Load dropped at dropoff node                         │
│    └─ Running total ≤ driver.capacityUnits                 │
│                                                              │
│    Pickup/Delivery Pairing:                                │
│    ├─ Both on same driver's route                          │
│    ├─ Pickup comes before dropoff                          │
│    └─ Same task number                                     │
│                                                              │
│    Return to Depot (if returnToDepot=true):                │
│    └─ Each route ends at its depot_end node                │
│                                                              │
│    Return Anywhere (if returnToDepot=false):               │
│    └─ No extra cost to skip depot_end                      │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. DEFINE OBJECTIVE FUNCTION                                │
│                                                              │
│    Minimize:                                                │
│    ├─ Distance cost (km scale)                             │
│    ├─ Plus unassigned penalties:                           │
│    │  └─ urgent tasks: 1000 penalty                        │
│    │  └─ high tasks: 500 penalty                           │
│    │  └─ normal tasks: 100 penalty                         │
│    │  └─ low tasks: 10 penalty                             │
│    └─ Times number of unassigned tasks of that priority    │
│                                                              │
│    Effect:                                                  │
│    → Urgent tasks almost always assigned                   │
│    → Normal tasks usually assigned                         │
│    → Low-priority tasks assigned only if room               │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. CONFIGURE SOLVER                                         │
│                                                              │
│    search_params:                                           │
│    ├─ time_limit.seconds = config.maxSolveSeconds          │
│    ├─ first_solution_strategy = PATH_CHEAPEST_ARC          │
│    │  (Greedy: repeatedly pick cheapest next edge)         │
│    ├─ local_search_metaheuristic = GUIDED_LOCAL_SEARCH     │
│    │  (Iteratively improve by trying small changes)        │
│    └─ random_seed = 0 (deterministic)                      │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. SOLVE                                                     │
│                                                              │
│    solution = routing.SolveWithParameters(search_params)    │
│                                                              │
│    Solver tries to:                                         │
│    ├─ Assign all tasks to drivers                          │
│    ├─ Respect all constraints                              │
│    ├─ Minimize objective (distance + unassigned penalties) │
│    └─ Complete before time limit                           │
│                                                              │
│    Possible outcomes:                                       │
│    ├─ OPTIMAL: Best solution found (rare for large)        │
│    ├─ ROUTING_SUCCESS: Good solution found                 │
│    ├─ ROUTING_FAIL_TIMEOUT: Time limit hit                 │
│    └─ ROUTING_FAIL: No solution feasible                   │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. EXTRACT RESULTS                                          │
│                                                              │
│    For each vehicle (driver):                               │
│    ├─ Trace route from start to end                        │
│    ├─ Collect all "pickup" and "dropoff" stops             │
│    ├─ For each stop:                                       │
│    │  ├─ arrivalS = cumulative time so far                 │
│    │  ├─ departureS = arrivalS + service time              │
│    │  └─ Add to stops list                                 │
│    ├─ Sum total distance for route                         │
│    └─ Sum total time for route                             │
│                                                              │
│    Identify unassigned:                                     │
│    ├─ For each task, check if its pickup node assigned     │
│    ├─ If not, determine reason:                            │
│    │  ├─ NO_DRIVER_AVAILABLE: No drivers exist or feasible │
│    │  ├─ TIME_WINDOW_INFEASIBLE: Shift doesn't overlap     │
│    │  ├─ CAPACITY_EXCEEDED: All drivers too small          │
│    │  └─ SOLVER_TIMEOUT: Timed out before assigning        │
│    └─ Add to unassigned list                               │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. RETURN RESPONSE                                         │
│                                                              │
│  {                                                           │
│    jobId: "...",                                            │
│    status: "completed",                                     │
│    routes: [                                                │
│      {                                                       │
│        driverId: "...",                                     │
│        stops: [...],                                        │
│        totalDistanceM: 25000,                               │
│        totalTimeS: 14400                                    │
│      }                                                       │
│    ],                                                        │
│    unassigned: [                                            │
│      { taskId: "...", reason: "CAPACITY_EXCEEDED" }         │
│    ]                                                         │
│  }                                                           │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
                 END
```

---

## Data Structure Example

### Input Graph

```
Scenario: 1 driver, 2 tasks

Nodes:
  0: Depot Start (driver's home: 36.7372, 3.0865)
  1: Task 1 Pickup (36.75, 3.05)
  2: Task 1 Dropoff (36.80, 3.10)
  3: Task 2 Pickup (36.70, 3.15)
  4: Task 2 Dropoff (36.85, 3.12)
  5: Depot End (driver's home: 36.7372, 3.0865)

Distance Matrix (simplified, in meters):
     0      1      2      3      4      5
0 [  0   5000   8000   7000  12000   0  ]
1 [5000   0    6000   2000   7000   8000]
2 [8000  6000   0    4000   3000  11000]
3 [7000  2000  4000   0    5000   9000 ]
4 [12000 7000  3000  5000   0   14000 ]
5 [  0   8000  11000  9000 14000   0  ]

Time Matrix (in seconds, = distance / (40 km/h)):
     0      1      2      3      4      5
0 [  0    450    720    630   1080    0  ]
1 [ 450    0     540    180    630    720 ]
2 [ 720   540     0     360    270    990 ]
3 [ 630   180    360     0     450    810 ]
4 [1080   630    270    450     0    1260]
5 [  0    720    990    810   1260    0  ]

Constraints:
- Pickup 1 in [32400, 36000] (9:00-10:00)
- Dropoff 1 by 50400 (2:00 PM)
- Pickup 2 in [32400, 36000]
- Dropoff 2 by 48600 (1:30 PM)
- Driver shift: [28800, 61200] (8 AM - 5 PM)

Possible Solution:
  Route: 0 → 1 (pickup task 1) → 2 (dropoff task 1) → 3 (pickup task 2) → 4 (dropoff task 2) → 5

With times:
  - Start at depot: 28800 (8:00 AM)
  - Arrive pickup 1: 33600 (9:20 AM) ✓ in window [32400, 36000]
  - Depart pickup 1: 34200 (9:30 AM) (after 10 min service)
  - Arrive dropoff 1: 37800 (10:30 AM)
  - Depart dropoff 1: 38100 (10:31:40 AM) (after 5 min service)
  - Arrive pickup 2: 38280 (10:38 AM) ✓ in window [32400, 36000]
  - Depart pickup 2: 38880 (10:48 AM) (after 10 min service)
  - Arrive dropoff 2: 39150 (10:52:30 AM) ✓ before 48600 (1:30 PM)
  - Depart dropoff 2: 39450 (10:57:30 AM) (after 5 min service)
  - Return to depot: 42930 (11:55:30 AM) ✓ before 61200 (5 PM)

Total: ~14130 seconds (~3.9 hours), ~28km
```

---

## Constraint Visualization

### Time Window Constraint

```
Task: Pickup Window [32400, 36000] = [9:00 AM, 10:00 AM]

Timeline:
08:00 ─────────────────────────────────────────── 17:00 (Driver shift)
            │                    │
            └────────────────────┘ ← Valid pickup window
         9:00                10:00

If driver arrives at 10:30 AM:
✗ VIOLATES CONSTRAINT (after 10:00 AM deadline)

If driver arrives at 9:30 AM:
✓ SATISFIES CONSTRAINT (within [9:00, 10:00])
```

### Capacity Constraint

```
Driver capacity: 5 units

Task 1: 2 units (pickup) → -2 units (dropoff)
Task 2: 3 units (pickup) → -3 units (dropoff)

Route 1 [Task 1, Task 2]:
  0 Depot     (load=0)
  ↓ +2 units (pickup task 1)
  1 Pickup 1  (load=2) ✓ ≤ 5
  ↓ -2 units (dropoff task 1)
  2 Dropoff 1 (load=0)
  ↓ +3 units (pickup task 2)
  3 Pickup 2  (load=3) ✓ ≤ 5
  ↓ -3 units (dropoff task 2)
  4 Dropoff 2 (load=0)
  ↓
  5 Depot     (load=0)
  ✓ ALL VALID

Route 2 (if we had a third task of 4 units):
  0 Depot       (load=0)
  ↓ +2 units
  1 Pickup 1    (load=2)
  ↓ +4 units
  3 Pickup 3    (load=6) ✗ EXCEEDS 5!
  ✗ CONSTRAINT VIOLATED
```

### Pickup/Delivery Pairing

```
Must on same driver AND pickup before dropoff:

Valid sequence:
  ... → Pickup Task A → ... → Dropoff Task A → ...
         ✓ Same driver
         ✓ Pickup first

Invalid:
  Driver 1: ... → Pickup Task A → ...
  Driver 2: ... → Dropoff Task A → ...
  ✗ Different drivers!

Invalid:
  Driver 1: ... → Dropoff Task A → ... → Pickup Task A → ...
  ✗ Dropoff before pickup!
```

---

## Performance Profile

```
Optimization Time vs Problem Size

Time (seconds)
│
60├─ ╱╲ maxSolveSeconds = 60
│  ╱  ╲
30├ ╱    ╲ maxSolveSeconds = 30
│╱        ╲
 └─────────╲──────────────────────
   10 tasks  50 tasks  200 tasks
   5 drivers 15 drivers 50 drivers

Insights:
- Small problems: Usually solve optimally in <5 sec
- Medium problems: Need 15-30 sec for good solutions
- Large problems: Hit time limit, return best found so far
- Increasing drivers usually easier than increasing tasks
  (complexity is O(2^tasks) roughly)
```

---

## Integration Sequence Diagram

```
Dispatcher          Backend API         Optimizer       Database
    │                   │                   │               │
    │ Click Optimize    │                   │               │
    ├──────────────────→│                   │               │
    │                   │ SELECT tasks      │               │
    │                   │ WHERE date=...    │───────────────→│
    │                   │                   │───────────────→│ (receive)
    │                   │ SELECT drivers    │               │
    │                   │                   │───────────────→│
    │                   │ SELECT config     │               │
    │                   │                   │───────────────→│
    │                   │ (build request)   │               │
    │                   │                   │               │
    │                   │ POST /optimize    │               │
    │                   ├──────────────────→│               │
    │                   │                   │               │
    │                   │                   │ (solve)       │
    │                   │                   │ ┌─────────────┐
    │                   │                   │ │ 15 seconds  │
    │                   │                   │ └─────────────┘
    │                   │                   │               │
    │                   │ ← return routes   │               │
    │                   │←──────────────────│               │
    │                   │ CREATE plan       │               │
    │                   │ CREATE routes     │───────────────→│
    │                   │ CREATE stops      │               │
    │                   │                   │───────────────→│ (stored)
    │                   │ planId            │               │
    │ ← Plan created   │←──────────────────│               │
    │ Review routes    │                   │               │
    │                   │                   │               │
```

---

## Next Steps

1. **Start the Optimizer:** `uvicorn main:app --reload --port 8000`
2. **Test with curl:** Use the example in OPTIMIZER_QUICK_REFERENCE.md
3. **Check logs:** Monitor optimizer output during optimization
4. **Vary parameters:** Try different `maxSolveSeconds` values
5. **Profile performance:** Track solve times vs problem sizes

