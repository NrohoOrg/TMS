# Admin — Platform Guide

You are the **Administrator**. You manage who can use the platform and who drives, and you keep an eye on the system's health.

---

## 1. Sign in

1. Open the app in your browser.
2. Enter the **admin email** and **password**, then click **Sign In**.

> _Screenshot: login screen_

After login you land on the **Dashboard**.

---

## 2. The Dashboard

This is your home page. It shows:

- How many **Users** exist (admins, dispatchers, cadres, drivers).
- How many **Drivers** are registered.
- How many **Tasks** are in the system today.
- How many **Plans** have been generated.
- A **System Health** tile (green = OK, red = issue).
- A short summary of **today's operations** (completed / in-progress / pending tasks for today).

Click any tile to jump to its detail page.

> _Screenshot: Admin dashboard_

---

## 3. Users — add, edit, remove

In the left sidebar click **Users**.

You'll see a table of every user, with their email, name, and role.

### Add a new user
1. Click **Add User**.
2. Fill in: email, name, phone, password, role (**Admin / Dispatcher / Cadre / Driver**).
3. Click **Save**.

### Edit an existing user
1. Click the **pencil** icon on the user's row.
2. Change name / phone / role / password.
3. Click **Save**.

### Remove a user
1. Click the **trash** icon on the user's row.
2. Confirm the delete prompt.

> _Screenshot: Users list with the Add User dialog open_

---

## 4. Drivers — manage the fleet

In the left sidebar click **Drivers**.

You'll see a table of every driver, with their phone, shift, capacity, depot, and active state.

### Add a new driver
1. Click **Add Driver**.
2. Fill in:
   - **Name** and **phone**.
   - **Shift start** and **Shift end** (24h, e.g. `08:00` to `17:00`).
   - **Depot** location (defaults to the Ministère des Startups).
   - **Capacity units** (how many tasks they can carry at once).
   - **Active** = on if the driver is currently employed and available.
3. Click **Save**.

### Deactivate a driver
- Click the **pencil**, untick **Active**, save. They stop appearing in the optimizer.

> _Screenshot: Drivers list_

---

## 5. Live Map

In the sidebar click **Live Map**. This shows today's published plan in **read-only** form: every driver's route, all the stops, the depot. Useful when management asks "what is our fleet doing right now?"

> _Screenshot: Admin live map_

---

## 6. System Health

In the sidebar click **System Health**. Three lines:

- **Database** — should be green (`ok`).
- **Redis** — should be green.
- **Optimizer** — should be green.

If any of them is red or yellow, escalate to IT — the dispatcher cannot generate plans without all three.

> _Screenshot: System Health_

---

## 7. Common tasks at a glance

| You want to… | Go to | What you click |
|---|---|---|
| Create a dispatcher account | Users | Add User → Role = Dispatcher |
| Add a new driver | Drivers | Add Driver |
| Take a driver off the road permanently | Drivers | Edit → uncheck Active |
| See today's overall operations | Dashboard | (just look) |
| See routes on a map | Live Map | (just look) |
| Verify the system is up | System Health | (just look) |

---

## 8. Things you do **not** need to touch

- The dispatcher creates and publishes plans daily.
- The cadre creates new task requests.
- Drivers receive SMS notifications automatically when a plan is published.

You don't have to step into those flows unless something goes wrong.
