# Better User Experience — v1.1 Simplification

*The dispatcher is constantly busy. Every extra click, field, or page costs them. This document strips the platform down to its essential workflows.*

---

## Driving Assumption

The dispatcher is **constantly busy** throughout the day. They juggle phone calls, incidents, and task management without pause. The platform must be **radically minimalist**:
- Only the essential workflows
- Smallest possible forms
- Fewest possible pages
- **Defaults over explicit inputs** whenever the dispatcher's input wouldn't meaningfully change the outcome

---

## R5.1 — Faster Task Creation (Address Autocomplete)

### R5.1.1 No manual coordinate entry
- The dispatcher must **never** type latitude/longitude by hand
- Address fields use **autocomplete**: dispatcher types a partial address, sees suggestions, selects one, and lat/lng are filled invisibly behind the scenes

### R5.1.2 Geocoding provider
- **Try Nominatim with autocomplete first** (free, already in the v1 stack)
- Evaluate Algerian address coverage and suggestion quality
- If Nominatim is insufficient, fall back to a paid provider (Google Maps Places Autocomplete or Mapbox) — abstract the geocoder behind a service interface so the provider can be swapped without touching UI or business logic

---

## R5.2 — Simplified Task Form

### R5.2.1 Reduced field set
The task creation form contains **only** these fields:

| Field | Behavior |
|---|---|
| Pickup address | Autocomplete (R5.1) |
| Dropoff address | Autocomplete (R5.1) |
| Date | Date picker |
| Time | Single time field — interpreted as the **pickup earliest** |
| Priority | Low / Normal / High / Urgent |

### R5.2.2 Removed fields (from the form)
The dispatcher no longer enters these — the system fills them automatically:
- **Pickup Latest** → auto-set to `Time + 30 minutes`
- **Pickup Service Time** → defaults to **20 minutes** (configurable globally in admin settings, not per task)

### R5.2.3 Removed fields (from the entire system)
The following are **deleted from the schema, the solver, and the UI** — not just hidden:
- **Dropoff Deadline** (the explicit `dropoffDeadlineS` field)
- **Dropoff Service Time** (the explicit `dropoffServiceS` field)

### R5.2.4 Internal soft constraint replacing dropoff deadline
Even though the dropoff deadline is removed from the data model, the solver must still bound delivery timing:
- Apply an **internal soft constraint**: dropoff must occur **within 2 hours of pickup**
- This is a system-wide rule, not a per-task field
- The 2-hour window should be a global config value (admin-adjustable) so it can be tuned without code changes

---

## R5.3 — Simplified Navigation Structure

### R5.3.1 Page list
The platform has only the following pages, in this order:

1. **Tasks** — view, create, edit tasks *(default landing page after login)*
2. **Drivers** — view drivers, check & confirm availability
3. **Planning** — show today's tasks + available drivers + a single **"Run Optimizer"** button
4. **Operations** — combined live map + monitoring (replaces the previous Live Map and Monitor pages)
5. **Incidents & New Tasks** — mid-day events (defined in R1.1)

### R5.3.2 Removed UI elements
- The **"New Draft"** button on the Planning page is removed — running the optimizer directly produces the plan; no draft step
- The separate **Live Map** page is removed (merged into Operations)
- The separate **Monitor** page is removed (merged into Operations)

### R5.3.3 Default landing page
After login, the dispatcher lands on the **Tasks** page (not the Operations page) — task entry and review is the most frequent activity.

---

## R5.4 — Combined "Operations" Page

This page replaces both the v1 Live Map and Monitor pages.

### R5.4.1 Layout
- **Map view** showing all drivers and their planned routes (same as the v1 Live Map)
- Drivers are **selectable** by clicking their marker on the map or their name in a side list

### R5.4.2 Driver detail panel (on selection)
When a driver is selected:
- Show their **ordered task list** for the day (pickup → dropoff sequence)
- Each task shows status: pending / started / done / skipped
- For each task, two action buttons available to the dispatcher:
  - **"Task Started"** — mark the pickup as started
  - **"Task Done"** — mark the dropoff as completed

### R5.4.3 Status updates are dispatcher-only
- These actions are performed **by the dispatcher** after verbally confirming with the driver by phone
- **No driver-side UI**, no driver app, no GPS auto-detection
- This is consistent with assumption A1 (drivers only use SMS and phone calls)

### R5.4.4 Downstream ETA recalculation
- When a task is marked started or done at a real timestamp different from the planned ETA, the system recomputes downstream ETAs on that driver's remaining route (existing v1 behavior, preserved)

---

## R5.5 — Unassigned Tasks Visibility

- After running the optimizer, the **list of unassigned tasks** remains visible to the dispatcher
- UI is simplified compared to v1: a clear list with task summary + reason code, no extra detail panels unless explicitly opened
- Unassigned tasks remain in the system for the dispatcher to handle manually (reschedule, cancel, or escalate via the Incidents page)

---

## Summary of Changes vs. v1

| Area | v1 | v1.1 simplified |
|---|---|---|
| **Task form fields** | 8+ explicit fields including coordinates, two service times, deadline | 5 fields: addresses (autocomplete), date, time, priority |
| **Coordinate entry** | Manual lat/lng required | Autocomplete only — never typed |
| **Pickup window** | Earliest + Latest both entered | Single Time field; Latest auto = Time + 30 min |
| **Service times** | Per-task pickup + dropoff service | Pickup hardcoded to 20 min (admin-configurable); dropoff service removed |
| **Dropoff deadline** | Explicit per-task field | Removed from schema; replaced by internal "dropoff within 2h of pickup" rule |
| **Geocoding** | Nominatim (manual lookup flow) | Nominatim with autocomplete (first), paid provider fallback |
| **Pages** | Tasks, Drivers, Availability, Planning, Live Map, Monitor | Tasks, Drivers, Planning, Operations, Incidents |
| **Planning page** | Has "New Draft" button + Run | Single "Run Optimizer" button only |
| **Live Map + Monitor** | Two separate pages | One combined "Operations" page |
| **Stop status updates** | Driver app scaffolding (unused) | Dispatcher-only buttons in Operations panel |
| **Default landing page** | Varies | Tasks page |

---

## Migration Notes for the Implementation Agent

These changes are **breaking changes to the data model**. The agent must:

1. Write a Prisma migration that:
   - Drops `dropoffDeadlineS` from the Task table
   - Drops `dropoffServiceS` from the Task table
   - Adds a global config row for `pickupServiceMinutesDefault` (default: 20)
   - Adds a global config row for `dropoffWithinHours` (default: 2)
2. Update the solver request DTO (`apps/optimizer/main.py`) to remove the dropped fields and add the soft 2-hour constraint
3. Update existing seed data, fixtures, and tests to match the new schema
4. Update the frontend task form to the new 5-field layout
5. Merge Live Map and Monitor routes into a single `/dispatcher/operations` page
6. Remove the "New Draft" button and any draft-state code paths from the Planning flow