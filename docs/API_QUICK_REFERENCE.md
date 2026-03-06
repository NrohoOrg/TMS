# API Quick Reference

Fast lookup for the most common endpoints used by the frontend. All paths below assume the global `/api` prefix and the standard response envelope `{ success, data }` / `{ success, error }`.

---

## Auth

### POST /api/auth/login
Auth: None  
Body:
```json
{ "email": "string", "password": "string" }
```
Returns:
```json
{
  "token": "ACCESS_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "user": {
    "id": "string",
    "name": "string|null",
    "email": "string",
    "role": "ADMIN|DISPATCHER",
    "phone": "string|null",
    "avatar": "string|null",
    "expiresIn": 900
  }
}
```
Errors: `INVALID_CREDENTIALS` (401)

### POST /api/auth/refresh
Auth: None (uses refresh token in body)  
Body:
```json
{ "refreshToken": "string" }
```
Returns:
```json
{ "token": "ACCESS_TOKEN", "refreshToken": "REFRESH_TOKEN" }
```
Errors: `UNAUTHORIZED` (401) on invalid/expired refresh token

### POST /api/auth/logout
Auth: Bearer  
Body:
```json
{}
```
Returns:
```json
{ "message": "Logged out successfully" }
```

### GET /api/auth/me
Auth: Bearer  
Returns:
```json
{
  "id": "string",
  "name": "string|null",
  "email": "string",
  "role": "ADMIN|DISPATCHER",
  "phone": "string|null",
  "avatar": "string|null",
  "lastLogin": "ISO date|null"
}
```

### POST /api/auth/password-reset
Auth: None  
Body:
```json
{ "email": "string" }
```
Returns:
```json
{
  "success": false,
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Password reset requires email service configuration. Contact your administrator."
  }
}
```

### POST /api/auth/password-reset/confirm
Auth: None  
Body:
```json
{ "token": "string", "newPassword": "string" }
```
Returns:
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

## Tasks (Dispatcher)

### GET /api/dispatcher/tasks
Auth: Bearer (ADMIN, DISPATCHER)  
Query:
```text
page, limit, date, status, priority, type, driver, search
```
Returns:
```json
{
  "items": [ { /* Task summary */ } ],
  "total": 47,
  "page": 1,
  "limit": 100,
  "totalPages": 1
}
```

### GET /api/dispatcher/tasks/:id
Auth: Bearer (ADMIN, DISPATCHER)  
Returns: full `Task` object for given `id`  
Errors: `NOT_FOUND` (404)

### POST /api/dispatcher/tasks
Auth: Bearer (ADMIN, DISPATCHER)  
Body (CreateTaskDto, simplified):
```json
{
  "title": "string",
  "pickupAddress": "string",
  "pickupLat": 36.691,
  "pickupLng": 3.215,
  "pickupWindowStart": "ISO date",
  "pickupWindowEnd": "ISO date",
  "dropoffAddress": "string",
  "dropoffLat": 36.753,
  "dropoffLng": 3.058,
  "dropoffDeadline": "ISO date",
  "priority": "low|normal|high|urgent",
  "notes": "string (optional)"
}
```
Returns: created `Task`  
Errors: `VALIDATION_ERROR` (400)

### PATCH /api/dispatcher/tasks/:id
Auth: Bearer (ADMIN, DISPATCHER)  
Body: partial `UpdateTaskDto`  
Returns: updated `Task`

### DELETE /api/dispatcher/tasks/:id
Auth: Bearer (ADMIN, DISPATCHER)  
Returns: no content (204)  
Errors: `CONFLICT` (409) when task cannot be cancelled

### POST /api/dispatcher/tasks/import
Auth: Bearer (ADMIN, DISPATCHER)  
Consumes: `multipart/form-data`  
Body:
```text
file: tasks.csv
```
Returns (201 on success, 400 on partial failure):
```json
{
  "imported": 32,
  "failed": 3,
  "errors": [
    { "row": 5, "reason": "..." }
  ]
}
```

---

## Drivers (Dispatcher)

### GET /api/dispatcher/drivers
Auth: Bearer (ADMIN, DISPATCHER)  
Returns: array of `Driver` objects

### POST /api/dispatcher/drivers
Auth: Bearer (ADMIN, DISPATCHER)  
Body (CreateDriverDto, simplified):
```json
{
  "name": "string",
  "phone": "string",
  "shiftStart": "HH:mm",
  "shiftEnd": "HH:mm",
  "depotLat": 36.691,
  "depotLng": 3.215,
  "capacityUnits": 10
}
```
Returns: created `Driver`

### PATCH /api/dispatcher/drivers/:id
Auth: Bearer (ADMIN, DISPATCHER)  
Body: partial `UpdateDriverDto`  
Returns: updated `Driver`

### DELETE /api/dispatcher/drivers/:id
Auth: Bearer (ADMIN, DISPATCHER)  
Returns: no content (204) — soft delete

---

## Availability (Dispatcher)

### GET /api/dispatcher/availability
Auth: Bearer (ADMIN, DISPATCHER)  
Query:
```text
date=YYYY-MM-DD
```
Returns:
```json
[
  {
    "driverId": "string",
    "date": "YYYY-MM-DD",
    "available": true,
    "shiftStart": "HH:mm",
    "shiftEnd": "HH:mm",
    "shiftStartOverride": "HH:mm|null",
    "shiftEndOverride": "HH:mm|null"
  }
]
```

### PATCH /api/dispatcher/availability/:driverId
Auth: Bearer (ADMIN, DISPATCHER)  
Body (UpdateAvailabilityDto, simplified):
```json
{
  "date": "YYYY-MM-DD",
  "available": true,
  "shiftStartOverride": "HH:mm",
  "shiftEndOverride": "HH:mm"
}
```
Returns: `Availability` row for that driver/date

---

## Planning / Optimization (Dispatcher)

### POST /api/dispatcher/planning/optimize
Auth: Bearer (ADMIN, DISPATCHER)  
Body (OptimizeDto, simplified):
```json
{
  "date": "YYYY-MM-DD",
  "includeUncompletedTasks": true,
  "drivers": "all",
  "config": {
    "startPolicy": "depot|flexible",
    "returnToDepot": true,
    "enableCapacityConstraints": true,
    "maxStopsPerDriver": 15,
    "objective": "standard|balance",
    "respectTimeWindows": true
  }
}
```
Returns:
```json
{
  "id": "OPT-JOB-001",
  "status": "queued",
  "progressPercent": 0,
  "planId": null,
  "error": null
}
```

### GET /api/dispatcher/planning/status/:jobId
Auth: Bearer (ADMIN, DISPATCHER)  
Returns:
```json
{
  "id": "OPT-JOB-001",
  "status": "queued|running|completed|failed",
  "progressPercent": 65,
  "planId": "PLN-... (when completed)",
  "error": "string|null"
}
```

### GET /api/dispatcher/planning/plans
Auth: Bearer (ADMIN, DISPATCHER)  
Returns:
```json
[
  {
    "id": "PLN-...",
    "date": "YYYY-MM-DD",
    "status": "draft|published",
    "createdAt": "ISO date",
    "publishedAt": "ISO date|null"
  }
]
```

### GET /api/dispatcher/planning/plans/:planId
Auth: Bearer (ADMIN, DISPATCHER)  
Returns:
```json
{
  "id": "PLN-...",
  "date": "YYYY-MM-DD",
  "status": "draft|published",
  "stats": {
    "totalTasks": 47,
    "assigned": 44,
    "unassigned": 3,
    "assignmentRate": 94,
    "totalTravelTime": 725,
    "totalDistance": 246,
    "driversUsed": 4,
    "avgUtilization": 77
  },
  "routes": [ /* per-driver routes with stops */ ],
  "unassigned": [ /* tasks + reasons */ ]
}
```

### POST /api/dispatcher/planning/plans/:planId/publish
Auth: Bearer (ADMIN, DISPATCHER)  
Returns:
```json
{
  "planId": "PLN-...",
  "status": "published",
  "publishedAt": "ISO date",
  "notifiedDrivers": 4
}
```
Errors: `CONFLICT` (409) if plan is not in `draft` status

---

## Geocoding

### GET /api/geocode/search
Auth: None  
Query:
```text
query=free text address
```
Returns:
```json
[
  {
    "placeId": "string",
    "displayName": "string",
    "lat": 36.7538,
    "lng": 3.0588,
    "type": "string|null",
    "importance": 0.7
  }
]
```

---

## Monitoring & Misc

### GET /health
Auth: None  
Returns (unwrapped):
```json
{ "status": "ok", "timestamp": "ISO date", "version": "1.0.0" }
```

> Note: This endpoint does **not** use the `{ success, data }` envelope.

