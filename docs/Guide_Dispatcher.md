# Dispatcher — Platform Guide

You are the **Dispatcher**. Your job: turn the day's incoming tasks into driver routes, monitor the execution, and react when things change mid-day.

---

## 1. Sign in

1. Open the app in your browser.
2. Enter your **dispatcher email** and **password** → **Sign In**.

> _Screenshot: login screen_

You'll land on the **Tasks** page — your default home.

---

## 2. Your sidebar — five pages

| Page | What it's for |
|---|---|
| **Tasks** | Today's tasks + create a new one + start the planner |
| **Drivers** | Confirm who is working today |
| **Planning** | View the day's plan on a map, publish it |
| **Operations** | Live map of execution; mark tasks Started / Done |
| **Incidents** | Mid-day events: add a new task, mark a driver unavailable |

---

## 3. Daily routine — the happy path

### Step 1 — review today's impact and tasks

On the **Tasks** page, the top strip shows **Today's impact**: how many tasks are done, how many km saved, fuel and CO₂ avoided. This is yesterday's plan if a new one isn't published yet.

Below the strip, you see the table of all tasks. Filter by status / priority / date if needed.

> _Screenshot: Tasks page with the Impact strip and the table_

### Step 2 — create new tasks (if needed)

Click **Create Task**. The form has only what's required:
- **Pickup address** — start typing, pick a real address from the dropdown.
- **Dropoff address** — same way.
- **Date** — when the task should be done.
- **Time** — when the pickup should start.
- **Priority** — Normal or Urgent.

Click **Save**. The new task lands in the list with status **pending**.

> _Screenshot: Create Task drawer_

### Step 3 — verify drivers for today

Click **Drivers** in the sidebar. You see every driver and a check-mark for whether they're available today. If a driver called in saying they can't work, untick them here. Save.

> _Screenshot: Drivers / availability page_

### Step 4 — generate the plan

Back on **Tasks**, click **Plan Routes** (top right). A small dialog appears showing:

- The **date** (defaults to today).
- How many **unassigned tasks** for that date.
- How many **active drivers** are available.

Click **Yes, generate**. The optimizer runs (a few seconds), and you're redirected to the **Planning** workspace.

> _Screenshot: Plan Routes confirm dialog_

### Step 5 — review the plan on the map

In **Planning**, the map shows every route in a different colour. The right side lists each driver's stop sequence. Tasks the optimizer couldn't fit appear in the **Unassigned** panel with a reason code.

> _Screenshot: Planning workspace_

### Step 6 — publish

When you're happy, click **Publish** in the top right.

- Each driver gets an **SMS** with their full ordered route for the day.
- The plan becomes **read-only**.
- You're automatically redirected to **Operations** to start monitoring.

> _Screenshot: Publish confirmation prompt and the SMS preview if available_

---

## 4. During the day — Operations page

This is where you spend most of the workday once the plan is live.

You see:
- A **map** with every driver's route.
- A **list of drivers** on the right; click a driver to focus their route.
- The selected driver's **ordered list of stops** (pickups and dropoffs as separate rows).
- An **Export** button (top right) to copy the day's state to clipboard for support.

### Confirming progress

When a driver tells you on the phone *"I picked it up"*:
- Find the pickup row → click **Task Started**.

When they tell you *"I delivered it"*:
- Find the dropoff row → click **Task Done**. (Disabled until the matching pickup is done.)

Each click recomputes the downstream ETAs automatically.

If a driver becomes unavailable mid-day, see Section 5 below.

> _Screenshot: Operations page with the driver task list and the two action buttons_

---

## 5. Handling mid-day events — Incidents page

Click **Incidents** in the sidebar. This page handles disruptions.

### A — A new task came in mid-day

1. Click **Add Task** (or **Add Urgent Task** if it's urgent).
2. Fill the form (same as Tasks page) and save.
3. The system **automatically re-optimizes** and shows you which driver got the task and where it lands in their sequence.
4. The chosen driver gets an **SMS**: *"Bonjour {name}, 1 tâche ajoutée à votre tournée: 14:30 {title} après {existing stop}"*.

> _Screenshot: Incidents page with the assignment result panel_

### B — A driver becomes unavailable

1. Pick the driver from the dropdown.
2. Pick **From** time (e.g. now).
3. Pick **Until** = "End of day" (default).
4. Click **Preview & Mark Unavailable** to see which of their tasks would be released.
5. Click **Release & Re-optimize**. The released tasks are re-fitted onto other drivers.
6. The result panel shows what moved where.
7. Each receiving driver gets an **SMS** with the new tasks added to their route.

> _Screenshot: Mark Driver Unavailable preview + Release & Re-optimize result_

### Date selector

If you're testing or adjusting yesterday's data, change the **Date** at the top of the page. Every action below it (add task, mark unavailable, re-optimize) operates on that date.

---

## 6. Quick reference

| You want to… | Go to | What you click |
|---|---|---|
| Add a regular task | Tasks | Create Task |
| Generate today's routes | Tasks | Plan Routes |
| Send drivers their plan by SMS | Planning | Publish |
| Mark a pickup done by phone | Operations | Task Started |
| Mark a delivery done by phone | Operations | Task Done |
| Slot in a new task during the day | Incidents | Add Task |
| Take a driver off the road today | Incidents | Mark Driver Unavailable → Release & Re-optimize |
| See yesterday's results | Tasks | (Today's Impact strip; rerun Plan Routes for that date) |

---

## 7. Tips

- **Always click an address from the dropdown** when filling the form. Typing the address text isn't enough — the dropdown pick is what attaches the GPS coordinates.
- Tasks set as **Urgent** get priority when the optimizer fits them in. Don't mark everything urgent — it dilutes the meaning.
- The **Impact strip** at the top of the Tasks page is yours to share with management. Take a screenshot.
- If you see a task on a driver's route in Operations but it's also tagged *Unassigned* in Planning, ignore it — the system reconciles itself; the Operations view is the truth.

---

## 8. Things only the Admin or Cadre do

- Adding a new driver to the fleet → ask the **Admin**.
- Submitting a task request that needs your approval → the **Cadre** does this from their account; you'll see those tasks in the Tasks list with status *pending approval* and approve/reject buttons.
