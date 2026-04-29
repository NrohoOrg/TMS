Dispatch Route Planning System (v1) — Specification
1) Overview
This product is a dispatch and route planning system for managing daily transport operations (people or items) across Algeria. Dispatchers enter tasks (Pickup A → Dropoff B) with time constraints and driver shift information. The system generates optimized route plans that group and sequence tasks per driver while respecting constraints.
No live GPS tracking in v1. Location and ETA are inferred from the plan plus optional manual check-ins.
Primary outcomes
Faster, more consistent daily planning
Better constraint compliance (time windows, shift hours)
Clear, auditable assignments and exports

2) Product Description
2.1 Users & Roles
Dispatcher/Admin: creates tasks, manages drivers, runs planner, reviews/edits plans, publishes assignments, monitors execution status.
Driver (optional in v1): views assigned route and can submit manual status updates (arrived/done/delay).
2.2 Core Workflows
Prepare inputs
Add/edit tasks with pickup/dropoff and time constraints.
Set driver availability and shift hours.
Plan
Run optimizer for a planning horizon (typically one day/shift).
Receive proposed routes + ETAs and a list of unassigned tasks with reasons.
Review & adjust
Dispatcher moves tasks between routes or reorders stops.
System validates constraints and recalculates ETAs.
Publish & export
Lock routes and export route sheets (PDF/CSV).
Execution monitoring (no GPS)
Manual status updates (dispatcher or driver) adjust downstream ETAs.
2.3 In Scope (v1)
Tasks: pickup/dropoff, time windows/deadlines, priority
Drivers: availability, shifts, start depot
Optimization: pickup-before-dropoff + time windows + shift constraints + optional capacity
Plan review UI (basic editing + validation)
Publish + exports
Manual status updates and ETA recalculation
Audit log
2.4 Out of Scope (v1)
Live GPS tracking / telematics
Automatic mid-route insertion / continuous re-optimization
Invoicing, payments
Multi-day optimization
Zone restrictions

3) Requirements
3.1 Task Requirements
Task = Pickup + Dropoff - Required: - Pickup location (address + lat/lon) - Dropoff location (address + lat/lon) - Time constraints (v1 default): - Pickup time window: earliest + latest - Delivery deadline: latest - Optional: - Priority (Low/Normal/High/Urgent) - Service time at pickup/dropoff (minutes) - Capacity units consumed (integer) - Notes + contact
States - Draft → Planned → Published → In Progress → Completed (or Cancelled)
3.2 Driver Requirements
Required:
Name, phone
Availability (Available/Unavailable)
Shift start/end
Start depot location (lat/lon)
Optional:
End depot (or “free end”)
Capacity units
3.3 Planning & Constraint Requirements
The optimizer must produce routes that satisfy: - Pickup occurs before dropoff for each task - Driver shift time window respected - Pickup window and delivery deadline respected - Optional capacity constraint respected (if enabled)
Depot behavior: configurable per plan run - Start at depot (default: yes) - Return to depot at end (toggle on/off)
3.4 Optimization Objective (v1)
Maximize number of assigned tasks (minimize unassigned)
Minimize total travel time
Minimize total distance (tie-breaker)
Respect priority: urgent tasks have higher penalty if unassigned
3.5 Plan Review & Editing
View proposed routes per driver (table + map + timeline)
Manual edits:
Move a task between drivers
Reorder stops
Lock a route to prevent change on re-run
Validation:
Recompute schedule and flag violations (time windows, shift)
Default behavior: block publishing if violations exist
3.6 Publishing & Exports
Publish routes as the official assignment plan for the day
Export:
PDF route sheet per driver
CSV export for routes/tasks
3.7 Execution Monitoring (No GPS)
Manual status updates on stops (Pending/Arrived/Done)
System recalculates downstream ETAs using actual timestamps when provided
“Estimated position” is derived from the plan timeline + last check-in

4) Non‑Functional Requirements
Security: authentication, role-based access (Admin/Dispatcher)
Auditability: immutable plan runs; publish creates a versioned plan; all edits logged
Reliability: graceful handling of missing geocodes and infeasible tasks
Performance target (soft): feasible plans for typical daily volumes in under ~60 seconds (depends on routing/matrix size)
Sovereignty/cost: prefer self-hosted open-source components

5) Technical Design (for technical stakeholders)
5.1 Target Stack (locked)
Monorepo: Nx
Backend: NestJS (TypeScript)
Frontend: Next.js (TypeScript)
Database: PostgreSQL (PostGIS optional)
Routing engine: OSRM (preferred) or Valhalla (self-host)
Solver: Python service using OR-Tools (self-host)
5.2 Monorepo Layout (recommended)
apps/api — NestJS REST API
apps/web — Next.js admin UI
apps/solver — Python FastAPI OR-Tools service (/solve, /health)
libs/domain — shared DTOs/types + validation
libs/routing — routing client + caching utilities
libs/ui — shared UI components
5.3 Services & Data Flow
Dispatcher creates tasks/drivers in Next.js
NestJS API stores data in Postgres
On “Run planner”:
API builds a node list (depot + pickups + dropoffs)
API queries routing engine to create travel time/distance matrix (cached)
API calls Solver with matrix + constraints
Solver returns routes + schedules + unassigned reasons
API stores the Plan Run result and serves it to the UI
5.4 Routing / Travel-Time Options (mostly free & in-house)
OSRM (self-host): fast routing + matrix (Table) durations
Valhalla (self-host): routing + matrix endpoint; extensible features
Traffic policy (v1): no real-time traffic by default. - Optional: configurable time-of-day multipliers (rush-hour factors) - Future: integrate paid traffic provider or feed traffic into an engine
5.5 Optimization Algorithm Options
OR-Tools (chosen for v1): PDPTW/VRPTW with time windows and pickup-before-dropoff
Alternatives (future): VROOM, OptaPlanner, jsprit
5.6 Solver Interface (high level)
Solver receives: - Drivers (shift windows, depot mode, optional capacity) - Tasks (pickup/dropoff nodes, service times, time windows, deadlines, priorities) - Travel time/distance matrices
Solver returns: - Routes per driver (ordered stops) - Planned arrival/departure times - Unassigned tasks + reason codes

6) Delivery Plan (Agent‑Effort Based)
Effort is tracked in two dimensions: - AEU (Agent Effort Unit): 1 hour of agent runtime (parallelizable) - HRU (Human Review Unit): 1 hour of human review/testing/decisions (pacing factor)
Work packages (v1)
WP0: Nx repo + CI + agent runbooks
WP1: DB schema/migrations + domain DTOs
WP2: Routing integration (OSRM/Valhalla) + matrix caching/batching
WP3: Solver service (OR-Tools PDPTW/VRPTW)
WP4: Next.js admin UI (tasks, drivers, planning, plan review)
WP5: Publishing + exports (PDF/CSV)
WP6: Execution monitor (manual status updates + ETA recalculation)
WP7: Security + audit log
WP8: QA scenarios + integration tests
Ballpark ranges (to be calibrated)
Total: ~90–220 AEU and ~50–120 HRU
Calibration step (recommended)
Run 3 representative features with agents (routing integration, a CRUD page, solver endpoint), measure actual AEU/HRU, then recalibrate.

7) Open Decisions (to finalize v1)
Depot policy: always fixed, or can start from non-depot locations?
Capacity model: simple “units” only, or weight/volume later?
Typical scale estimate (rough): tasks/day and drivers/day (even a guess helps performance planning)




