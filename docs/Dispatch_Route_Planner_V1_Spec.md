# Additional Requirements — v1.1 Extension

*Refinement of operational notes captured during the design review. Each section below extends or adjusts the v1 specification.*

---

## Assumptions

These assumptions frame the scope and operational reality of the v1.1 extension. All requirements below are designed under these constraints.

### A1 — Driver behavior and tech literacy
- Drivers are assumed to have **limited technical literacy**
- Drivers use **basic feature phones** (not smartphones); no mobile app can be deployed to them
- Drivers can **read SMS messages** and **make/receive phone calls** — nothing more is assumed
- Drivers may have **limited SMS credits**, so they cannot be expected to send replies or confirmations
- Any interaction model that requires the driver to install software, click links, or use a web interface is **out of scope**

### A2 — Fleet size
- The maximum number of drivers in the system is **8 drivers**
- This is a small fleet by VRP/PDPTW standards — solver performance, SMS volume, and re-optimization cost are all bounded by this number
- Architectural decisions can be optimized for this scale (e.g. no need for sharding, batching, or large-scale messaging infrastructure)
- The system should still degrade gracefully if the fleet grows modestly (up to ~20), but no design effort is spent on hundreds-of-drivers scenarios

---

## R1 — Stochastic & Sudden Event Handling

### R1.1 New "Incidents & New Tasks" dispatcher page
Dedicated dispatcher screen for logging mid-day disruptive events without re-creating data. Three actions available:
- **Add a new mid-day task** (same fields as morning task creation, plus an `urgent` flag)
- **Mark a driver as unavailable** (sick, vehicle breakdown) starting from a chosen time
- **Mark a task as cancelled** (selected from the existing assigned/pending list)

### R1.2 Frozen plan principle
- Tasks already **completed or in progress** are never touched by re-optimization
- Tasks already **assigned and pending** on a still-available driver remain locked to that driver
- Re-optimization only operates on the **orphaned/new task pool**

### R1.3 Driver unavailability handling
- Marking a driver unavailable **automatically** releases their **not-yet-started** tasks back to the unassigned pool (no re-typing required)
- The driver is excluded from re-optimization for the duration of unavailability
- Already-started or completed tasks on that driver remain untouched

### R1.4 Cancelled task handling
- Cancelled tasks are simply marked cancelled and skipped by the assigned driver
- **No re-optimization triggered**
- Downstream ETAs on the affected route are recomputed (existing v1 behavior)

### R1.5 Mid-day re-optimization (new solver phase)
- Triggered manually: dispatcher logs events on the Incidents page, then clicks **"Run mid-day re-optimization"**
- Operates only on:
  - Tasks released from unavailable drivers
  - New non-urgent mid-day tasks
- Each still-available driver contributes only their **remaining shift time after their already-assigned, not-yet-started tasks** (gap-filling only)
- Already-assigned pending tasks act as **locked stops** in the solver model
- Same constraints as morning planning (time windows, capacity, shift)
- Uses the same `maxSolveSeconds` budget (default 30s)
- **Acceptable outcome:** if a task can't fit, it stays unassigned; dispatcher handles it manually

### R1.6 Urgent interrupt mode (bypasses solver)
When a new task is added with the `urgent` flag:
- System identifies the **closest currently-active driver** to the urgent task's pickup point, using **Haversine distance** (consistent with the optimizer)
- That driver **abandons their current trip mid-route** and goes directly to the urgent task
- After completing pickup + dropoff of the urgent task, the driver **resumes their original route** from where they were diverted
- All remaining ETAs on that driver's route are **automatically recomputed and pushed later** to reflect the detour
- If the push causes deadline violations on later stops, the dispatcher is alerted (manual handling — no auto-reassignment)

### R1.7 Real-time reactivity
- Event logging and re-optimization triggers must complete in **seconds**, not minutes
- Urgent interrupt routing is **instant** (distance lookup + route mutation, no solver call)

### R1.8 Audit trail for events
Each incident logged produces an immutable record:
- Event type (driver unavailable / new task / cancellation / urgent interrupt)
- Timestamp, dispatcher who logged it
- Affected driver(s) and task(s)
- Outcome (which tasks were released, reassigned, or stayed unassigned)

---

## R2 — Task Creation by Other Personnel

**Status: No new requirement.**

Use case (managers, executives, secretaries adding tasks) is fully covered by the existing Dispatcher/Admin role through shared account access. No system changes needed.

---

## R3 — Driver Categorization (Department / Personal / VIP Convoy)

**Status: Acknowledged but deferred to a future version.**

Real operational need exists for:
- Department-affiliated drivers (Finance, HR, etc.)
- Dedicated personal drivers (e.g. minister's driver)
- VIP security convoys (multiple drivers moving as a group)

**Not in scope for v1.1.** Will be revisited in a later iteration once core dispatch behavior is stabilized.

---

## R4 — Driver Communication Channel

### R4.1 SMS as the sole communication channel
- All notifications to drivers go via **SMS only**
- No mobile app, no web link, no WhatsApp
- Rationale: see assumption A1 (drivers use basic feature phones, limited tech literacy)

### R4.2 Notification events (kept minimal — no spam)
The system sends an SMS to a driver in only two situations:
1. **Morning route notification** — once per day, when the plan is published, containing **that driver's full task list** (addresses, times, sequence)
2. **New mid-day task notification** — each time a new task (urgent or non-urgent) is assigned to that driver after morning publication

No SMS for cancellations, ETA recalculations, or other routine changes.

### R4.3 Per-driver personalized SMS content
- Each SMS contains **only that driver's tasks** (not a broadcast)
- Format must be readable on basic phones (plain text, no formatting, careful with multi-part messages)

### R4.4 Confirmation of receipt — manual model
- **No automated confirmation mechanism** (drivers may lack credits to reply, can't use apps — see assumption A1)
- The system marks SMS as `sent` only
- **Dispatcher is responsible** for verbally confirming receipt via phone call when needed
- Dispatcher UI shows a list of drivers who have been sent SMS (with timestamp) so they can track who to follow up with

### R4.5 Escalation policy
- If reception is uncertain, the **dispatcher manually calls** the driver
- **No automated voice call**, no auto-retry of SMS
- The dispatcher's judgment determines when a call is needed

### R4.6 SMS gateway selection
- The specific SMS provider (paid gateway like Twilio / Vonage, local Algerian provider, or self-hosted GSM modem) is **TBD**
- The system architecture must abstract the SMS sender behind a service interface so the gateway can be swapped without touching business logic
- Cost, deliverability, and Algerian network coverage to be evaluated separately

---

## Summary of Changes vs. v1 Spec

| Area | v1 (current) | v1.1 (with these requirements) |
|---|---|---|
| **Mid-day events** | None — plan is static after publish | Incidents page + mid-day re-optimization + urgent interrupts |
| **Re-optimization** | Once per day (morning) | Morning + on-demand mid-day passes |
| **Urgent task handling** | Same priority system, solver-handled | New "interrupt mode" — closest driver diverts immediately |
| **Driver communication** | Printed/exported route sheet only | SMS at morning + on new task assignment |
| **Receipt confirmation** | N/A | Manual (dispatcher calls if uncertain) |
| **Driver categorization** | Single pool | Deferred — same as v1 |
| **New data entities** | — | `Incident` (audit log), SMS dispatch records, driver unavailability windows |
| **Solver changes** | — | New "mid-day mode" supporting locked stops + remaining shift slack |