# TMS API Testing Guide

Complete reference for manually testing every endpoint.  
All paths use the global `/api` prefix and the base URL `http://localhost:3001`.  
Every successful response is wrapped: `{ "success": true, "data": { ... } }`  
Every error response is wrapped: `{ "success": false, "error": { "code": "...", "message": "..." } }`

> **Swagger UI** is available at `http://localhost:3001/api/docs` — you can paste your Bearer token there and try calls interactively.

---

## Table of Contents

1. [Auth](#1-auth)
2. [Tasks (Dispatcher)](#2-tasks-dispatcher)
3. [Drivers (Dispatcher)](#3-drivers-dispatcher)
4. [Availability (Dispatcher)](#4-availability-dispatcher)
5. [Planning & Optimization (Dispatcher)](#5-planning--optimization-dispatcher)
6. [Monitoring & Reports (Dispatcher)](#6-monitoring--reports-dispatcher)
7. [Geocoding](#7-geocoding)
8. [Admin — Users](#8-admin--users)
9. [Admin — Config](#9-admin--config)
10. [Health](#10-health)

---

## 1. Auth

### 1.1 — POST /api/auth/login

**What it does:** Validates email + password and issues a short-lived JWT access token (15 min) plus a long-lived refresh token. Use the returned `token` as the `Bearer` token on every protected endpoint.

**Auth required:** None

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@example.com",    // required — registered user email
  "password": "StrongPass123!"     // required — plain-text password (min 8 chars)
}
```

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT access token — use in Authorization header
    "refreshToken": "d3f8a1c2...",                         // opaque refresh token — store securely
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",        // UUID of the authenticated user
      "name": "Dispatch Admin",                             // display name (can be null)
      "email": "admin@example.com",                         // user's email address
      "role": "ADMIN",                                      // "ADMIN" or "DISPATCHER"
      "phone": "+213555000001",                             // phone number (can be null)
      "avatar": null,                                       // avatar URL (not implemented, always null)
      "expiresIn": 900                                      // access token lifetime in seconds (15 min)
    }
  }
}
```

**Error responses:**
```json
// 401 — wrong email or wrong password
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid credentials" } }

// 429 — too many attempts (>10 per minute from same IP)
{ "success": false, "error": { "code": "THROTTLE_ERROR", "message": "Too many requests" } }
```

---

### 1.2 — POST /api/auth/refresh

**What it does:** Exchanges an active refresh token for a brand-new access token + refresh token pair (rotation). The old refresh token is immediately invalidated.

**Auth required:** None

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "refreshToken": "d3f8a1c2..."   // required — the refresh token received from /login or a previous /refresh
}
```

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // new access token
    "refreshToken": "e4a9b2f1..."                          // new refresh token (old one is now invalid)
  }
}
```

**Error responses:**
```json
// 401 — refresh token expired, already used, or not found
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Invalid refresh token" } }
```

---

### 1.3 — POST /api/auth/logout

**What it does:** Revokes ALL active refresh tokens for the current user. The access token still works until it expires naturally (15 min).

**Auth required:** Bearer token

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{}
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"   // confirmation message
  }
}
```

---

### 1.4 — GET /api/auth/me

**What it does:** Returns the full profile of the currently authenticated user from the JWT.

**Auth required:** Bearer token

**Headers:**
```
Authorization: Bearer <token>
```

**No body / no query params.**

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",       // user UUID
    "name": "Dispatch Admin",                             // display name (can be null)
    "email": "admin@example.com",                         // login email
    "role": "ADMIN",                                      // "ADMIN" or "DISPATCHER"
    "phone": "+213555000001",                             // phone number (can be null)
    "avatar": null,                                       // avatar URL (always null in v1)
    "lastLogin": "2026-03-08T07:45:00.000Z"              // last successful login timestamp (can be null)
  }
}
```

---

### 1.5 — POST /api/auth/password-reset

**What it does:** NOT IMPLEMENTED. Would send a password reset email. Returns a structured error.

**Auth required:** None

**Body:**
```json
{ "email": "user@example.com" }
```

**Response (always this, no email is sent):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Password reset requires email service configuration. Contact your administrator."
  }
}
```

---

### 1.6 — POST /api/auth/password-reset/confirm

**What it does:** NOT IMPLEMENTED. Would finalize a password reset. Returns a structured error.

**Auth required:** None

**Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewStrongPass456!"
}
```

**Response (always this):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Password reset requires email service configuration. Contact your administrator."
  }
}
```

---

## 2. Tasks (Dispatcher)

All task endpoints require Bearer token with role `ADMIN` or `DISPATCHER`.

---

### 2.1 — GET /api/dispatcher/tasks

**What it does:** Returns a paginated, filterable list of tasks. Use query params to filter by status, date range, or keyword. Results are ordered by pickup window start ascending.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters (all optional):**
```
status      = pending | assigned | cancelled          // filter by task status
dateFrom    = YYYY-MM-DD                              // filter tasks with pickupWindowStart >= this date
dateTo      = YYYY-MM-DD                              // filter tasks with pickupWindowStart <= this date
search      = alger                                   // keyword — matched against title and addresses
page        = 1                                       // page number (default: 1, min: 1)
limit       = 20                                      // items per page (default: 20, max: 100)
```

**Example:**
```
GET /api/dispatcher/tasks?status=pending&dateFrom=2026-03-08&limit=50
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",         // task UUID
        "title": "Pickup shipment A1",                         // human-readable task name
        "pickupAddress": "10 Rue Didouche Mourad, Alger",      // full text pickup address
        "pickupLat": 36.75,                                    // pickup latitude (WGS84)
        "pickupLng": 3.05,                                     // pickup longitude (WGS84)
        "pickupWindowStart": "2026-03-08T09:00:00.000Z",       // earliest allowed pickup (ISO 8601)
        "pickupWindowEnd": "2026-03-08T10:00:00.000Z",         // latest allowed pickup (ISO 8601)
        "pickupServiceMinutes": 10,                            // time to spend at pickup location (minutes)
        "dropoffAddress": "Rue Hassiba Ben Bouali, Alger",     // full text delivery address
        "dropoffLat": 36.80,                                   // delivery latitude (WGS84)
        "dropoffLng": 3.10,                                    // delivery longitude (WGS84)
        "dropoffDeadline": "2026-03-08T14:00:00.000Z",         // hard delivery deadline (ISO 8601)
        "dropoffServiceMinutes": 5,                            // time to spend at delivery location (minutes)
        "priority": "normal",                                  // "low" | "normal" | "high" | "urgent"
        "status": "pending",                                   // "pending" | "assigned" | "cancelled"
        "notes": "Fragile — handle with care",                 // driver instructions (can be null)
        "createdAt": "2026-03-07T20:00:00.000Z",               // record creation timestamp
        "updatedAt": "2026-03-07T20:00:00.000Z"                // last update timestamp
      }
    ],
    "total": 47,        // total matching tasks across all pages
    "page": 1,          // current page number
    "limit": 20,        // items per page used for this response
    "totalPages": 3     // total number of pages
  }
}
```

---

### 2.2 — GET /api/dispatcher/tasks/:id

**What it does:** Retrieves the full details of a single task by its UUID.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**URL param:**
```
:id   — UUID of the task, e.g. b1c2d3e4-f5a6-7890-bcde-f12345678901
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "title": "Pickup shipment A1",
    "pickupAddress": "10 Rue Didouche Mourad, Alger",
    "pickupLat": 36.75,
    "pickupLng": 3.05,
    "pickupWindowStart": "2026-03-08T09:00:00.000Z",
    "pickupWindowEnd": "2026-03-08T10:00:00.000Z",
    "pickupServiceMinutes": 10,
    "dropoffAddress": "Rue Hassiba Ben Bouali, Alger",
    "dropoffLat": 36.80,
    "dropoffLng": 3.10,
    "dropoffDeadline": "2026-03-08T14:00:00.000Z",
    "dropoffServiceMinutes": 5,
    "priority": "normal",
    "status": "pending",
    "notes": "Fragile — handle with care",
    "createdAt": "2026-03-07T20:00:00.000Z",
    "updatedAt": "2026-03-07T20:00:00.000Z"
  }
}
```

**Error responses:**
```json
// 404 — no task with that UUID
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Task not found" } }
```

---

### 2.3 — POST /api/dispatcher/tasks

**What it does:** Creates a new task. The task starts in `pending` status and is eligible for the next optimization run.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Pickup shipment A1",                   // required — task name (min 1 char)
  "pickupAddress": "10 Rue Didouche Mourad, Alger", // required — full pickup address text
  "pickupLat": 36.75,                               // required — pickup latitude (-90 to 90)
  "pickupLng": 3.05,                                // required — pickup longitude (-180 to 180)
  "pickupWindowStart": "2026-03-08T09:00:00.000Z",  // required — earliest pickup (ISO 8601)
  "pickupWindowEnd": "2026-03-08T10:00:00.000Z",    // required — latest pickup (ISO 8601)
  "pickupServiceMinutes": 10,                       // optional — minutes to spend at pickup (default: 0)
  "dropoffAddress": "Rue Hassiba Ben Bouali, Alger", // required — full delivery address text
  "dropoffLat": 36.80,                              // required — delivery latitude (-90 to 90)
  "dropoffLng": 3.10,                               // required — delivery longitude (-180 to 180)
  "dropoffDeadline": "2026-03-08T14:00:00.000Z",    // required — hard delivery deadline (ISO 8601)
  "dropoffServiceMinutes": 5,                       // optional — minutes to spend at delivery (default: 0)
  "priority": "normal",                             // optional — "low"|"normal"|"high"|"urgent" (default: "normal")
  "notes": "Fragile — handle with care"             // optional — driver instructions
}
```

**Success response (201):** Same full Task object as in 2.2.

**Error responses:**
```json
// 400 — validation failed (e.g. missing required field, bad ISO date)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "pickupWindowStart must be a valid ISO date string"
  }
}
```

---

### 2.4 — PATCH /api/dispatcher/tasks/:id

**What it does:** Partially updates a task. All fields are optional — send only the fields you want to change. **Note:** `status` cannot be changed via this endpoint; it is managed automatically by the system.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL param:**
```
:id   — UUID of the task to update
```

**Body (all fields optional, send only what changes):**
```json
{
  "title": "Updated title",
  "pickupAddress": "New pickup address",
  "pickupLat": 36.76,
  "pickupLng": 3.06,
  "pickupWindowStart": "2026-03-08T10:00:00.000Z",
  "pickupWindowEnd": "2026-03-08T11:00:00.000Z",
  "pickupServiceMinutes": 15,
  "dropoffAddress": "New dropoff address",
  "dropoffLat": 36.81,
  "dropoffLng": 3.11,
  "dropoffDeadline": "2026-03-08T16:00:00.000Z",
  "dropoffServiceMinutes": 10,
  "priority": "high",
  "notes": "Updated instructions"
}
```

**Success response (200):** Same full Task object as in 2.2, with updated values.

---

### 2.5 — DELETE /api/dispatcher/tasks/:id

**What it does:** Soft-cancels a task (sets status to `cancelled`). Cannot cancel a task that is already `assigned` to an active route.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**URL param:**
```
:id   — UUID of the task to cancel
```

**Success response:** `204 No Content` — no body returned.

**Error responses:**
```json
// 409 — task is currently assigned to a driver route
{ "success": false, "error": { "code": "CONFLICT", "message": "Cannot cancel an assigned task" } }

// 404 — task not found
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Task not found" } }
```

---

### 2.6 — POST /api/dispatcher/tasks/import

**What it does:** Bulk-creates tasks from a CSV file. The CSV must have a header row. Rows that fail validation are skipped and reported in `errors`. If any rows fail, the response is 400 even though successful rows are still imported.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
```
file  = tasks.csv   (binary file field named "file")
```

**CSV required columns:**
```
title, pickupAddress, pickupLat, pickupLng, pickupWindowStart, pickupWindowEnd,
dropoffAddress, dropoffLat, dropoffLng, dropoffDeadline
```

**CSV optional columns:**
```
pickupServiceMinutes, dropoffServiceMinutes, priority, notes
```

**Success response (201 — all rows imported):**
```json
{
  "success": true,
  "data": {
    "imported": 32,   // number of tasks successfully created
    "failed": 0,      // number of rows that failed validation
    "errors": []      // empty array when no failures
  }
}
```

**Partial failure response (400 — some rows failed):**
```json
{
  "success": false,
  "error": {
    "imported": 29,   // rows that were still successfully created
    "failed": 3,      // rows that were skipped
    "errors": [
      { "row": 5,  "reason": "pickupLat must be a valid number" },
      { "row": 12, "reason": "pickupWindowStart must be a valid ISO date string" },
      { "row": 18, "reason": "title should not be empty" }
    ]
  }
}
```

---

## 3. Drivers (Dispatcher)

All driver endpoints require Bearer token with role `ADMIN` or `DISPATCHER`.

---

### 3.1 — GET /api/dispatcher/drivers

**What it does:** Returns all active (non-deleted) drivers. Used to populate driver selects/dropdowns and the availability grid.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**No query params.**

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c1d2e3f4-a5b6-7890-cdef-012345678901",   // driver UUID
      "name": "Ahmed Benali",                           // driver full name
      "phone": "+213555000001",                         // contact phone number
      "shiftStart": "08:00",                            // default shift start in HH:MM
      "shiftEnd": "17:00",                              // default shift end in HH:MM
      "depotLat": 36.7372,                              // driver's home depot latitude
      "depotLng": 3.0865,                               // driver's home depot longitude
      "capacityUnits": 10,                              // max cargo units (can be null = unlimited)
      "active": true,                                   // false = soft-deleted, never returned here
      "createdAt": "2026-01-10T08:00:00.000Z",          // record creation timestamp
      "updatedAt": "2026-03-01T09:00:00.000Z"           // last update timestamp
    }
  ]
}
```

---

### 3.2 — POST /api/dispatcher/drivers

**What it does:** Creates a new driver record. The driver is immediately active and available for optimization.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Ahmed Benali",       // required — driver full name (min 1 char)
  "phone": "+213555000001",     // required — contact phone number
  "shiftStart": "08:00",        // required — default shift start (format: HH:MM, 24h)
  "shiftEnd": "17:00",          // required — default shift end (format: HH:MM, 24h)
  "depotLat": 36.7372,          // required — home depot latitude (-90 to 90)
  "depotLng": 3.0865,           // required — home depot longitude (-180 to 180)
  "capacityUnits": 10           // optional — max cargo units per route (omit = unlimited)
}
```

**Success response (201):** Same full Driver object as in 3.1.

---

### 3.3 — PATCH /api/dispatcher/drivers/:id

**What it does:** Partially updates a driver's information. All fields optional.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL param:**
```
:id   — UUID of the driver to update
```

**Body (all fields optional):**
```json
{
  "name": "Ahmed Benali Updated",
  "phone": "+213555000099",
  "shiftStart": "07:00",
  "shiftEnd": "16:00",
  "depotLat": 36.74,
  "depotLng": 3.09,
  "capacityUnits": 15
}
```

**Success response (200):** Updated full Driver object.

---

### 3.4 — DELETE /api/dispatcher/drivers/:id

**What it does:** Soft-deletes a driver (sets `active = false`). The driver no longer appears in the list and is excluded from future optimization runs. Historical data is preserved.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**URL param:**
```
:id   — UUID of the driver to soft-delete
```

**Success response:** `204 No Content` — no body returned.

---

## 4. Availability (Dispatcher)

Daily availability overrides for drivers. If no availability row exists for a driver on a given date, the driver is considered available by default with their standard shift times.

---

### 4.1 — GET /api/dispatcher/availability

**What it does:** Returns availability records for all active drivers for a specific date. If a driver has no row for that date, they are considered available with their default shift.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters:**
```
date  = YYYY-MM-DD    // optional — defaults to today if omitted
```

**Example:**
```
GET /api/dispatcher/availability?date=2026-03-08
```

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "driverId": "c1d2e3f4-a5b6-7890-cdef-012345678901",  // driver UUID
      "date": "2026-03-08",                                  // date in YYYY-MM-DD
      "available": true,                                     // false = driver is off that day
      "shiftStart": "08:00",                                 // driver's default shift start
      "shiftEnd": "17:00",                                   // driver's default shift end
      "shiftStartOverride": "09:00",                         // overridden start for this day (null = using default)
      "shiftEndOverride": null                               // overridden end for this day (null = using default)
    }
  ]
}
```

---

### 4.2 — PATCH /api/dispatcher/availability/:driverId

**What it does:** Creates or updates the availability record for one driver on a specific date (upsert). Use this to mark a driver as unavailable or to override their shift times for a day.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL param:**
```
:driverId   — UUID of the driver
```

**Body:**
```json
{
  "date": "2026-03-08",          // required — the date to set (YYYY-MM-DD)
  "available": false,            // required — true = working that day, false = off
  "shiftStartOverride": "09:00", // optional — override shift start for this day (HH:MM)
  "shiftEndOverride": "14:00"    // optional — override shift end for this day (HH:MM)
}
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "d2e3f4a5-b6c7-8901-defa-123456789012",           // availability record UUID
    "driverId": "c1d2e3f4-a5b6-7890-cdef-012345678901",     // driver UUID
    "date": "2026-03-08T00:00:00.000Z",                      // date stored as UTC midnight
    "available": false,                                       // availability flag
    "shiftStartOverride": "09:00",                           // override or null
    "shiftEndOverride": "14:00"                              // override or null
  }
}
```

---

## 5. Planning & Optimization (Dispatcher)

The optimization flow: **POST /optimize** → get a `jobId` → **poll GET /status/:jobId** until complete → get `planId` → **GET /plans/:planId** to review → **POST /plans/:planId/publish** to activate.

---

### 5.1 — POST /api/dispatcher/planning/optimize

**What it does:** Queues a background optimization job for a given date. Takes all `pending` tasks and all available drivers for that date, sends them to the Python optimizer, and builds a plan with optimized routes. Returns immediately with a `jobId` — poll status to wait for completion.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "date": "2026-03-08",       // required — date to optimize (YYYY-MM-DD)
  "returnToDepot": true       // optional — whether drivers must return to depot after last drop-off (default: false)
}
```

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "jobId": "e3f4a5b6-c7d8-9012-efab-234567890123",   // UUID of the optimization job — use to poll status
    "status": "queued",                                  // initial status: "queued"
    "startedAt": null,                                   // null until the worker picks it up
    "estimatedTimeSeconds": 60                           // rough estimate for how long it will take
  }
}
```

**Error responses:**
```json
// 400 — no pending tasks exist for that date
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "No pending tasks for date" } }

// 400 — no active drivers
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "No active drivers available for date" } }

// 400 — all drivers are marked unavailable for that date
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "No available drivers for date" } }
```

---

### 5.2 — GET /api/dispatcher/planning/status/:jobId

**What it does:** Polls the status of an optimization job. Keep calling until `status` is `completed` or `failed`. When completed, `planId` contains the UUID of the created plan.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**URL param:**
```
:jobId   — UUID from the POST /optimize response
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "e3f4a5b6-c7d8-9012-efab-234567890123",           // optimization job UUID
    "status": "completed",                                       // "queued" | "running" | "completed" | "failed"
    "progressPercent": 100,                                      // 0-100 progress indicator
    "planId": "f4a5b6c7-d8e9-0123-fabc-345678901234",           // UUID of created plan (null until completed)
    "error": null,                                               // error message string if status = "failed"
    "startedAt": "2026-03-08T08:00:05.000Z",                    // when the worker started processing
    "finishedAt": "2026-03-08T08:00:35.000Z"                    // when the job finished (null if still running)
  }
}
```

---

### 5.3 — GET /api/dispatcher/planning/plans

**What it does:** Lists all optimization plans, newest first. Used to browse historical plans or pick a plan to publish.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**No query params.**

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "planId": "f4a5b6c7-d8e9-0123-fabc-345678901234",   // plan UUID
      "date": "2026-03-08",                                // date this plan covers (YYYY-MM-DD)
      "status": "draft",                                   // "draft" | "published"
      "createdAt": "2026-03-08T08:00:35.000Z",             // when the plan was created
      "routeCount": 4,                                     // number of driver routes in this plan
      "taskCount": 44                                      // total tasks assigned across all routes
    }
  ]
}
```

---

### 5.4 — GET /api/dispatcher/planning/plans/:planId

**What it does:** Returns full details of a plan including every route, every stop with ETAs, and any unassigned tasks with the reason they couldn't be assigned.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**URL param:**
```
:planId   — UUID of the plan
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "planId": "f4a5b6c7-d8e9-0123-fabc-345678901234",     // plan UUID
    "date": "2026-03-08",                                   // date this plan covers
    "status": "draft",                                      // "draft" | "published"
    "routes": [
      {
        "driverId": "c1d2e3f4-a5b6-7890-cdef-012345678901", // driver UUID
        "driverName": "Ahmed Benali",                        // driver display name
        "totalDistanceKm": 38.5,                            // total driving distance in km
        "totalTimeMinutes": 245,                            // total route duration in minutes
        "stops": [
          {
            "stopId": "a5b6c7d8-e9f0-1234-abcd-456789012345",  // stop UUID
            "sequence": 1,                                      // order in the route (1-based)
            "taskId": "b1c2d3e4-f5a6-7890-bcde-f12345678901",  // task UUID this stop belongs to
            "type": "pickup",                                   // "pickup" or "dropoff"
            "etaSeconds": 32400,                               // seconds since midnight when driver arrives
            "departureSeconds": 33000,                         // seconds since midnight when driver departs
            "status": "pending",                               // "pending"|"arrived"|"done"|"skipped"
            "task": {
              "title": "Pickup shipment A1",
              "pickupAddress": "10 Rue Didouche Mourad, Alger",
              "dropoffAddress": "Rue Hassiba Ben Bouali, Alger",
              "priority": "normal"
            }
          }
        ]
      }
    ],
    "unassigned": [
      {
        "taskId": "c2d3e4f5-a6b7-8901-cdef-567890123456",   // unassigned task UUID
        "title": "Delivery Z",                               // task name
        "pickupAddress": "Far away address",                 // pickup text
        "dropoffAddress": "Very far dropoff",                // dropoff text
        "priority": "low",                                   // task priority
        "reason": "No driver with available capacity"        // why it couldn't be assigned
      }
    ]
  }
}
```

---

### 5.5 — POST /api/dispatcher/planning/plans/:planId/publish

**What it does:** Publishes a draft plan. This makes it visible to drivers in the driver app. Only plans with `status: "draft"` can be published. Calling this again on an already-published plan returns 409.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**URL param:**
```
:planId   — UUID of the draft plan to publish
```

**No body.**

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "planId": "f4a5b6c7-d8e9-0123-fabc-345678901234",   // plan UUID
    "status": "published",                                // now "published"
    "publishedAt": "2026-03-08T09:00:00.000Z",           // timestamp when published
    "notifiedDrivers": 4                                 // number of drivers whose routes were published
  }
}
```

**Error responses:**
```json
// 409 — plan is not in draft status
{ "success": false, "error": { "code": "CONFLICT", "message": "Only draft plans can be published" } }
```

---

## 6. Monitoring & Reports (Dispatcher)

---

### 6.1 — PATCH /api/dispatcher/stops/:stopId/status

**What it does:** Updates the status of a single stop on a route (used by drivers or dispatcher to track progress). Validates allowed transitions, logs the event, and recalculates downstream ETAs. Allowed status values: `arrived`, `done`, `skipped`.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL param:**
```
:stopId   — UUID of the stop to update
```

**Body:**
```json
{
  "status": "arrived",         // required — "arrived" | "done" | "skipped"
  "notes": "Driver at gate A", // optional — notes logged with this event
  "actualArrivalTime": "09:35" // optional — actual arrival time (HH:MM) used for ETA recalculation
}
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "stopId": "a5b6c7d8-e9f0-1234-abcd-456789012345",   // updated stop UUID
    "status": "arrived",                                   // new status of this stop
    "nextStop": {                                          // details on the next stop (null if this was last)
      "stopId": "b6c7d8e9-f0a1-2345-bcde-567890123456",
      "sequence": 2,
      "taskId": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "type": "dropoff",
      "etaSeconds": 36000,                               // recalculated ETA based on actual arrival
      "task": {
        "title": "Pickup shipment A1",
        "pickupAddress": "10 Rue Didouche Mourad, Alger",
        "dropoffAddress": "Rue Hassiba Ben Bouali, Alger"
      }
    }
  }
}
```

**Error responses:**
```json
// 409 — invalid status transition (e.g. going from "done" back to "arrived")
{ "success": false, "error": { "code": "CONFLICT", "message": "Invalid status transition" } }
```

---

### 6.2 — GET /api/dispatcher/monitor

**What it does:** Returns a real-time overview of today's (or a given date's) dispatch operations — task counts, driver progress, and recent events feed.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters:**
```
date   = YYYY-MM-DD   // optional — defaults to today
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-08",                     // the monitored date
    "planId": "f4a5b6c7-d8e9-0123-fabc-345678901234",  // active published plan for this date (null if none)
    "overview": {
      "total": 44,       // total stops scheduled for today
      "completed": 12,   // stops with status "done"
      "inProgress": 3,   // stops currently "arrived" (driver on-site)
      "pending": 29,     // stops not yet started
      "delays": 2        // stops where actual arrival was later than ETA
    },
    "drivers": [
      {
        "id": "c1d2e3f4-a5b6-7890-cdef-012345678901",   // driver UUID
        "name": "Ahmed Benali",                           // driver name
        "phone": "+213555000001",                         // driver phone
        "vehicle": null,                                  // vehicle info (not implemented in v1, always null)
        "status": "on_route",                             // "on_route" | "at_stop" | "completed"
        "currentStop": {
          "stopId": "a5b6c7d8-e9f0-1234-abcd-456789012345",
          "sequence": 3,
          "taskId": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
          "address": "10 Rue Didouche Mourad, Alger",    // address of current/next stop
          "scheduledArrival": "10:30",                   // HH:MM from optimized plan
          "etaSeconds": 37800                            // current calculated ETA in seconds since midnight
        },
        "progress": {
          "completed": 3,   // stops this driver has completed today
          "total": 11       // total stops assigned to this driver today
        }
      }
    ],
    "recentEvents": [
      {
        "time": "2026-03-08T09:35:00.000Z",              // event timestamp (ISO 8601)
        "driverId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
        "driverName": "Ahmed Benali",
        "event": "Arrived at stop #3 — 10 Rue Didouche Mourad",  // human-readable event description
        "type": "info"                                    // "success" | "warning" | "info"
      }
    ]
  }
}
```

---

### 6.3 — GET /api/dispatcher/reports

**What it does:** Returns KPI aggregates and per-day/per-driver breakdowns for a date range. Use for historical performance analysis.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters (all optional):**
```
period     = 1d | 7d | 30d        // preset period (default: "7d") — ignored if startDate/endDate given
startDate  = YYYY-MM-DD           // custom range start
endDate    = YYYY-MM-DD           // custom range end
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "period": "7d",               // period used (matches query param)
    "startDate": "2026-03-01",    // actual start date of the report window
    "endDate": "2026-03-07",      // actual end date of the report window
    "kpis": {
      "avgPlanTime": 35,                  // average seconds from queue to completed for optimization jobs
      "avgDailyCompletionRate": 88.5,     // average daily task completion rate (%) over the period
      "totalTasks": 217,                  // total tasks created/active in the window
      "completedTasks": 192,              // tasks for which all stops are "done"
      "completionRate": 88.5,             // completedTasks / totalTasks * 100
      "totalPlans": 7,                    // total plans created in the window
      "publishedPlans": 6                 // plans that were published to drivers
    },
    "dailySummary": [
      {
        "date": "2026-03-01",
        "tasks": 31,                  // tasks active on this day
        "completed": 28,              // tasks completed on this day
        "completionRate": 90.3,       // completion % for this day
        "plans": 1,                   // plans created on this day
        "publishedPlans": 1           // plans published on this day
      }
    ],
    "driverPerformance": [
      {
        "driverId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
        "driverName": "Ahmed Benali",
        "assignedTasks": 55,          // tasks assigned to this driver in the window
        "completedStops": 48,         // stops completed by this driver
        "completionRate": 87.3        // completedStops / total stops * 100
      }
    ],
    "unassignedAnalysis": {
      "totalUnassigned": 25,          // total unassigned task slots across all optimization jobs
      "jobsAnalyzed": 6,              // number of completed optimization jobs analyzed
      "byReason": [
        {
          "reason": "No driver with available capacity",
          "count": 15,
          "percentage": 60.0
        },
        {
          "reason": "Time window too tight",
          "count": 10,
          "percentage": 40.0
        }
      ]
    }
  }
}
```

---

### 6.4 — GET /api/dispatcher/reports/export

**What it does:** Exports the same report data as a CSV file download. PDF format is not implemented.

**Auth required:** Bearer — ADMIN or DISPATCHER

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters:**
```
period     = 1d | 7d | 30d    // optional, same as /reports
startDate  = YYYY-MM-DD       // optional
endDate    = YYYY-MM-DD       // optional
format     = csv | pdf        // optional — default "csv" (pdf returns 501)
```

**Success response (200):** Raw CSV file with `Content-Type: text/csv`.

**Error responses:**
```json
// 501 — PDF not implemented
{
  "success": false,
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "PDF report export is not available in v1. Planned for v2."
  }
}
```

---

## 7. Geocoding

---

### 7.1 — GET /api/geocode/search

**What it does:** Searches for addresses using OpenStreetMap Nominatim under the hood. Results are cached to avoid hitting rate limits. Returns up to `limit` candidates ranked by relevance.

**Auth required:** None

**Query parameters:**
```
q      = Algiers Central Station    // required — free-text address or place name (min 1 char)
limit  = 5                          // optional — max results (default: 5, max: 10)
```

**Example:**
```
GET /api/geocode/search?q=Rue+Didouche+Mourad+Alger&limit=3
```

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "placeId": "1234567",                           // Nominatim internal place ID
      "displayName": "Rue Didouche Mourad, Alger, Algérie",  // full resolved address string
      "lat": 36.7538,                                 // latitude to use as pickupLat / dropoffLat
      "lng": 3.0588,                                  // longitude to use as pickupLng / dropoffLng
      "type": "street",                               // Nominatim place type (can be null)
      "importance": 0.65                              // relevance score 0-1 (can be null)
    }
  ]
}
```

---

## 8. Admin — Users

All admin endpoints require Bearer token with role `ADMIN` only.

---

### 8.1 — GET /api/admin/users

**What it does:** Lists all user accounts in the system.

**Auth required:** Bearer — ADMIN only

**Headers:**
```
Authorization: Bearer <token>
```

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",    // user UUID
      "name": "Dispatch Admin",                          // display name (can be null)
      "email": "admin@example.com",                      // login email
      "role": "ADMIN",                                   // "ADMIN" | "DISPATCHER"
      "lastLogin": "2026-03-08T07:45:00.000Z",           // last successful login (can be null)
      "createdAt": "2026-01-01T00:00:00.000Z"            // account creation timestamp
    }
  ]
}
```

---

### 8.2 — POST /api/admin/users

**What it does:** Creates a new user account. Passwords are hashed before storage.

**Auth required:** Bearer — ADMIN only

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Dispatch Admin",          // required — display name (min 1 char)
  "email": "admin@example.com",      // required — unique email address
  "password": "StrongPass123!",      // required — plain-text password (min 8 chars, hashed on server)
  "role": "DISPATCHER"               // required — "ADMIN" | "DISPATCHER"
}
```

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "New Dispatcher",
    "email": "dispatcher@example.com",
    "role": "DISPATCHER",
    "createdAt": "2026-03-08T10:00:00.000Z"
  }
}
```

**Error responses:**
```json
// 409 — email already registered
{ "success": false, "error": { "code": "CONFLICT", "message": "Email already exists" } }
```

---

### 8.3 — PATCH /api/admin/users/:id

**What it does:** Updates a user's profile fields. Cannot change the password via this endpoint.

**Auth required:** Bearer — ADMIN only

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL param:**
```
:id   — UUID of the user to update
```

**Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "email": "new.email@example.com",
  "role": "ADMIN",
  "phone": "+213555123456"
}
```

**Success response (200):** Updated user object (same shape as 8.2).

---

### 8.4 — DELETE /api/admin/users/:id

**What it does:** Permanently deletes a user account. Cannot delete your own account or a user who has optimization jobs.

**Auth required:** Bearer — ADMIN only

**Headers:**
```
Authorization: Bearer <token>
```

**URL param:**
```
:id   — UUID of the user to delete
```

**Success response:** `204 No Content` — no body.

**Error responses:**
```json
// 403 — trying to delete the currently authenticated user
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Cannot delete current user" } }

// 409 — user has existing optimization jobs
{ "success": false, "error": { "code": "CONFLICT", "message": "User has optimization jobs" } }
```

---

## 9. Admin — Config

System-wide dispatcher configuration (single row with `id = 1`).

---

### 9.1 — GET /api/admin/config

**What it does:** Returns the current global dispatch configuration.

**Auth required:** Bearer — ADMIN only

**Headers:**
```
Authorization: Bearer <token>
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,                           // always 1 — single config row
    "maxSolveSeconds": 30,             // max time (seconds) given to the optimizer before it times out
    "speedKmh": 40.0,                  // assumed average vehicle speed used for ETA calculations
    "objectiveWeights": {              // scoring weights used during optimization
      "urgent": 1000,                  // penalty multiplier for not assigning urgent tasks
      "high": 500,                     // penalty multiplier for not assigning high priority tasks
      "normal": 100,                   // penalty multiplier for not assigning normal tasks
      "low": 10                        // penalty multiplier for not assigning low priority tasks
    },
    "updatedAt": "2026-03-01T08:00:00.000Z"  // last time config was changed
  }
}
```

---

### 9.2 — PATCH /api/admin/config

**What it does:** Partially updates the global dispatch configuration.

**Auth required:** Bearer — ADMIN only

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (all fields optional):**
```json
{
  "maxSolveSeconds": 60,             // optional — new optimizer timeout (min: 1)
  "speedKmh": 50.0,                  // optional — new assumed speed in km/h (min: 0.1)
  "objectiveWeights": {              // optional — replace priority scoring weights entirely
    "urgent": 2000,
    "high": 800,
    "normal": 200,
    "low": 20
  }
}
```

**Success response (200):** Updated config object (same shape as 9.1).

---

### 9.3 — GET /api/admin/health

**What it does:** Runs health checks on the database, Redis, and the Python optimizer microservice. Always returns 200 — check `data.status` for the real result.

**Auth required:** Bearer — ADMIN only

**Headers:**
```
Authorization: Bearer <token>
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "status": "ok",             // "ok" | "degraded" — overall system health
    "checks": {
      "database": "ok",         // "ok" | "error" — PostgreSQL connectivity
      "redis": "ok",            // "ok" | "error" — Redis connectivity
      "optimizer": "ok"         // "ok" | "error" — Python optimizer microservice reachability
    }
  }
}
```

---

## 10. Health

### 10.1 — GET /health

**What it does:** Basic liveness probe. Returns the server status without authentication. Note: This endpoint does **NOT** use the `{ success, data }` envelope — it returns the object directly.

**Auth required:** None

**No headers, no body, no query params.**

**Success response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-08T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Appendix: Common Error Codes

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body or query params failed validation |
| 400 | `BAD_REQUEST` | Business logic rejection (e.g. no pending tasks) |
| 401 | `UNAUTHORIZED` | Missing, expired, or invalid token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password on login |
| 403 | `FORBIDDEN` | Authenticated but not allowed (e.g. DISPATCHER on admin route) |
| 404 | `NOT_FOUND` | Resource with given ID does not exist |
| 409 | `CONFLICT` | Operation conflicts with current state |
| 429 | `THROTTLE_ERROR` | Rate limit hit (10 requests/min per IP on auth routes) |
| 501 | `NOT_IMPLEMENTED` | Feature planned but not yet built |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

## Appendix: Response Envelope

All endpoints (except `GET /health`) wrap responses:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```
