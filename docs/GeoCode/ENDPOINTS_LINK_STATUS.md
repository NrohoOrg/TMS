# API Endpoints: Link Status Report

**Date:** March 22, 2026  
**Generated:** Comprehensive audit of all backend API endpoints vs. frontend integration and UI pages

---

## Executive Summary

| Category | Total | Linked | Partially Linked | Not Linked | Coverage |
|----------|-------|--------|------------------|------------|----------|
| **Auth** | 6 | 4 | 0 | 2 | 67% |
| **Tasks** | 6 | 6 | 0 | 0 | 100% |
| **Drivers** | 4 | 4 | 0 | 0 | 100% |
| **Availability** | 2 | 2 | 0 | 0 | 100% |
| **Planning** | 5 | 5 | 0 | 0 | 100% |
| **Geocoding** | 1 | 1 | 0 | 0 | 100% |
| **Admin** | 7 | 7 | 0 | 0 | 100% |
| **Health** | 1 | 0 | 0 | 1 | 0% |
| **TOTALS** | **32** | **29** | **0** | **3** | **91%** |

---

# ✅ FULLY LINKED ENDPOINTS (29)

These endpoints have **both**:
1. ✅ API functions in feature module
2. ✅ React Query hooks
3. ✅ TypeScript types
4. ✅ UI page to consume them

## 1. Tasks (6/6 - 100%)

| Endpoint | Method | API Function | Hook(s) | UI Page | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/dispatcher/tasks` | GET | `listTasks()` | `useTasksList()` | `/dispatcher/tasks` | ✅ Linked |
| `/api/dispatcher/tasks/:id` | GET | `getTask()` | `useTaskDetail()` | `/dispatcher/tasks/[id]` | ✅ Linked |
| `/api/dispatcher/tasks` | POST | `createTask()` | `useCreateTask()` | `/dispatcher/tasks` (modal) | ✅ Linked |
| `/api/dispatcher/tasks/:id` | PATCH | `updateTask()` | `useUpdateTask()` | `/dispatcher/tasks` (modal) | ✅ Linked |
| `/api/dispatcher/tasks/:id` | DELETE | `deleteTask()` | `useDeleteTask()` | `/dispatcher/tasks` (list item) | ✅ Linked |
| `/api/dispatcher/tasks/import` | POST | `importTasks()` | `useImportTasks()` | `/dispatcher/tasks` (modal) | ✅ Linked |

### UI Page: `/dispatcher/tasks`
```
Location: apps/frontend/src/app/dispatcher/tasks/page.tsx
Consumes: 
  - useTasksList() ← GET /api/dispatcher/tasks
  - useCreateTask() ← POST /api/dispatcher/tasks
  - useUpdateTask() ← PATCH /api/dispatcher/tasks/:id
  - useDeleteTask() ← DELETE /api/dispatcher/tasks/:id
  - useImportTasks() ← POST /api/dispatcher/tasks/import
  - useGeocodeSearch() ← GET /api/geocode/search (for address autocomplete)
Status: ✅ Active
```

---

## 2. Drivers (4/4 - 100%)

| Endpoint | Method | API Function | Hook(s) | UI Page | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/dispatcher/drivers` | GET | `listDrivers()` | `useDriversList()` | `/dispatcher/drivers` | ✅ Linked |
| `/api/dispatcher/drivers` | POST | `createDriver()` | `useCreateDriver()` | `/dispatcher/drivers` (modal) | ✅ Linked |
| `/api/dispatcher/drivers/:id` | PATCH | `updateDriver()` | `useUpdateDriver()` | `/dispatcher/drivers` (modal) | ✅ Linked |
| `/api/dispatcher/drivers/:id` | DELETE | `deleteDriver()` | `useDeleteDriver()` | `/dispatcher/drivers` (list item) | ✅ Linked |

### UI Page: `/dispatcher/drivers`
```
Location: apps/frontend/src/app/dispatcher/drivers/page.tsx
Consumes:
  - useDriversList() ← GET /api/dispatcher/drivers
  - useCreateDriver() ← POST /api/dispatcher/drivers
  - useUpdateDriver() ← PATCH /api/dispatcher/drivers/:id
  - useDeleteDriver() ← DELETE /api/dispatcher/drivers/:id
Status: ✅ Active
```

---

## 3. Availability (2/2 - 100%)

| Endpoint | Method | API Function | Hook(s) | UI Page | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/dispatcher/availability` | GET | `listAvailability()` | `useAvailabilityList()` | `/dispatcher/availability` | ✅ Linked |
| `/api/dispatcher/availability/:driverId` | PATCH | `upsertAvailability()` | `useUpsertAvailability()` | `/dispatcher/availability` (grid) | ✅ Linked |

### UI Page: `/dispatcher/availability`
```
Location: apps/frontend/src/app/dispatcher/availability/page.tsx
Consumes:
  - useAvailabilityList() ← GET /api/dispatcher/availability
  - useUpsertAvailability() ← PATCH /api/dispatcher/availability/:driverId
Status: ✅ Active
```

---

## 4. Planning & Optimization (5/5 - 100%)

| Endpoint | Method | API Function | Hook(s) | UI Page | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/dispatcher/planning/optimize` | POST | `startOptimization()` | `useStartOptimization()` | `/dispatcher/planning` | ✅ Linked |
| `/api/dispatcher/planning/status/:jobId` | GET | `getOptimizationStatus()` | `useOptimizationStatus()` | `/dispatcher/planning` (status monitor) | ✅ Linked |
| `/api/dispatcher/planning/plans` | GET | `listPlans()` | `usePlansList()` | `/dispatcher/planning` | ✅ Linked |
| `/api/dispatcher/planning/plans/:planId` | GET | `getPlanDetail()` | `usePlanDetail()` | `/dispatcher/planning/[planId]` | ✅ Linked |
| `/api/dispatcher/planning/plans/:planId/publish` | POST | `publishPlan()` | `usePublishPlan()` | `/dispatcher/planning` (list item action) | ✅ Linked |

### UI Page: `/dispatcher/planning`
```
Location: apps/frontend/src/app/dispatcher/planning/page.tsx
Consumes:
  - useStartOptimization() ← POST /api/dispatcher/planning/optimize
  - useOptimizationStatus() ← GET /api/dispatcher/planning/status/:jobId (polls every 2s)
  - usePlansList() ← GET /api/dispatcher/planning/plans
  - usePlanDetail() ← GET /api/dispatcher/planning/plans/:planId
  - usePublishPlan() ← POST /api/dispatcher/planning/plans/:planId/publish
  - useUpdateStopStatus() ← PATCH /api/dispatcher/stops/:stopId/status (in route details)
Status: ✅ Active
```

---

## 5. Geocoding (1/1 - 100%)

| Endpoint | Method | API Function | Hook(s) | Used In | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/geocode/search` | GET | `geocodeSearch()` | `useGeocodeSearch()` | Tasks & Planning pages | ✅ Linked |

### Integration Points:
```
- Task creation form: Address field autocomplete
- Location: apps/frontend/src/app/dispatcher/tasks/page.tsx
- Hook: useGeocodeSearch() ← GET /api/geocode/search
Status: ✅ Active
```

---

## 6. Stops (1/1 - 100%)

| Endpoint | Method | API Function | Hook(s) | UI Page | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/dispatcher/stops/:stopId/status` | PATCH | `updateStopStatus()` | `useUpdateStopStatus()` | `/dispatcher/planning/[planId]` | ✅ Linked |

### UI Page: `/dispatcher/planning/[planId]`
```
Location: apps/frontend/src/app/dispatcher/planning/[planId]/page.tsx
Consumes:
  - useUpdateStopStatus() ← PATCH /api/dispatcher/stops/:stopId/status
Usage: Mark stop as completed, failed, etc.
Status: ✅ Active
```

---

## 7. Auth (4/6 - 67%)

| Endpoint | Method | API Function | Hook(s) | UI Page | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/auth/login` | POST | `loginUser()` | `useLogin()` | `/login` | ✅ Linked |
| `/api/auth/refresh` | POST | `refreshToken()` | Auto-called in interceptor | Automatic | ✅ Linked |
| `/api/auth/logout` | POST | `logoutUser()` | `useLogout()` | All pages (navbar) | ✅ Linked |
| `/api/auth/me` | GET | `getCurrentUser()` | `useCurrentUser()` | All pages (session bootstrap) | ✅ Linked |
| `/api/auth/password-reset` | POST | `requestPasswordReset()` | ❌ Not implemented | ❌ Not wired | ❌ Not Linked |
| `/api/auth/password-reset/confirm` | POST | `confirmPasswordReset()` | ❌ Not implemented | ❌ Not wired | ❌ Not Linked |

### UI Pages:
```
- Login: apps/frontend/src/app/login/page.tsx
  Consumes: useLogin() ← POST /api/auth/login
  
- Session Bootstrap: apps/frontend/src/providers.tsx
  Consumes: useCurrentUser(), useSessionBootstrap()
  
- Logout: Navbar (global component)
  Consumes: useLogout() ← POST /api/auth/logout
```

---

## 8. Admin (7/7 - 100%)

| Endpoint | Method | API Function | Hook(s) | UI Page | Status |
|----------|--------|--------------|---------|---------|--------|
| `/api/admin/users` | GET | `listUsers()` | `useUsersList()` | `/admin/users` | ✅ Linked |
| `/api/admin/users` | POST | `createUser()` | `useCreateUser()` | `/admin/users` (modal) | ✅ Linked |
| `/api/admin/users/:id` | PATCH | `updateUser()` | `useUpdateUser()` | `/admin/users` (modal) | ✅ Linked |
| `/api/admin/users/:id` | DELETE | `deleteUser()` | `useDeleteUser()` | `/admin/users` (list item) | ✅ Linked |
| `/api/admin/config` | GET | `getConfig()` | `useAdminConfig()` | `/admin/config` | ✅ Linked |
| `/api/admin/config` | PATCH | `updateConfig()` | `useUpdateConfig()` | `/admin/config` (form) | ✅ Linked |
| `/api/admin/health` | GET | `getAdminHealth()` | `useAdminHealth()` | `/admin/health` | ✅ Linked |

### UI Pages:
```
- Admin Users: apps/frontend/src/app/admin/users/page.tsx
  Consumes: useUsersList(), useCreateUser(), useUpdateUser(), useDeleteUser()
  
- Admin Config: apps/frontend/src/app/admin/config/page.tsx
  Consumes: useAdminConfig(), useUpdateConfig()
  
- Admin Health: apps/frontend/src/app/admin/health/page.tsx
  Consumes: useAdminHealth()
```

---

# ❌ NOT LINKED ENDPOINTS (3)

These endpoints exist in backend but are **not linked** to any UI page/component.

## 1. Password Reset (2 endpoints)

| Endpoint | Method | Reason | Backend Status |
|----------|--------|--------|-----------------|
| `/api/auth/password-reset` | POST | Not implemented on backend (marked as NOT_IMPLEMENTED) | Returns error response |
| `/api/auth/password-reset/confirm` | POST | Not implemented on backend (marked as NOT_IMPLEMENTED) | Returns error response |

**Why Not Linked:**
- Backend explicitly returns `NOT_IMPLEMENTED` error
- No UI page exists (`/forgot-password` or `/reset-password`)
- Can be implemented when email service is configured

**To Link When Ready:**
1. Implement backend endpoint to send reset email
2. Create frontend pages: `/forgot-password` and `/reset-password`
3. Add API functions: `requestPasswordReset()`, `confirmPasswordReset()`
4. Add hooks: `useRequestPasswordReset()`, `useConfirmPasswordReset()`
5. Create `/features/auth/password-reset/` module

---

## 2. Health Check (1 endpoint)

| Endpoint | Method | Reason | Usage |
|----------|--------|--------|-------|
| `/api/health` | GET | System health check endpoint | Infrastructure monitoring |

**Why Not Linked:**
- This is an infrastructure/monitoring endpoint
- Not meant for UI consumption
- Used by:
  - Docker health checks
  - Kubernetes liveness probes
  - Infrastructure monitoring tools (DataDog, New Relic, etc.)
  - Load balancers

**Current Setup:**
```
- Location: Backend NestJS app
- Used by: Docker HEALTHCHECK instruction
- Response: { "status": "ok" } when system is healthy
```

**Should Link If:**
- Want to show system health status in admin dashboard
- Create `/admin/system-status` page consuming this endpoint

---

# 📊 Link Status by Feature

```
┌─────────────────────────────────────────────────────┐
│           FEATURE        │  TOTAL  │  LINKED  │  %  │
├──────────────────────────┼─────────┼──────────┼─────┤
│ Auth                     │    6    │    4     │ 67% │
│ Tasks                    │    6    │    6     │100% │
│ Drivers                  │    4    │    4     │100% │
│ Availability             │    2    │    2     │100% │
│ Planning & Optimization  │    5    │    5     │100% │
│ Geocoding                │    1    │    1     │100% │
│ Stops                    │    1    │    1     │100% │
│ Admin (Users/Config)     │    7    │    7     │100% │
│ Health/Monitoring        │    1    │    0     │  0% │
├──────────────────────────┼─────────┼──────────┼─────┤
│ TOTAL                    │   32    │   29     │ 91% │
└─────────────────────────────────────────────────────┘
```

---

# 🔗 Integration Map

## File Structure

```
apps/frontend/src/
├── features/
│   ├── auth/
│   │   ├── api/index.ts          ← loginUser, refreshToken, logoutUser, getCurrentUser
│   │   ├── hooks/index.ts        ← useLogin, useLogout, useCurrentUser
│   │   └── types/index.ts        ← AuthToken, User, LoginPayload
│   │
│   ├── dispatcher/
│   │   ├── api/index.ts          ← 25 functions for tasks/drivers/availability/planning/geocode
│   │   ├── hooks/index.ts        ← 20+ hooks
│   │   └── types/index.ts        ← 15+ types
│   │
│   └── admin/
│       ├── api.ts                ← 6 functions for users/config/health
│       ├── hooks.ts              ← 6 hooks
│       └── types.ts              ← 3 type interfaces
│
└── app/
    ├── dispatcher/
    │   ├── tasks/page.tsx        ← Tasks CRUD
    │   ├── drivers/page.tsx       ← Drivers CRUD
    │   ├── availability/page.tsx  ← Availability grid
    │   ├── planning/page.tsx      ← Planning & optimization
    │   ├── planning/[planId]/page.tsx  ← Plan detail & route execution
    │   ├── monitor/page.tsx       ← Monitoring (may need endpoints)
    │   └── reports/page.tsx       ← Reporting (may need endpoints)
    │
    ├── admin/
    │   ├── users/page.tsx         ← Admin users CRUD
    │   ├── config/page.tsx        ← System configuration
    │   ├── health/page.tsx        ← System health
    │   ├── audit/page.tsx         ← Audit logs (may need endpoints)
    │   ├── fleet/page.tsx         ← Fleet stats (may need endpoints)
    │   └── drivers/page.tsx       ← Driver fleet (may need endpoints)
    │
    └── driver/
        └── page.tsx              ← Driver app (driver-specific routes)
```

---

# 📋 Features NOT YET INTEGRATED

### Monitor Page: `/dispatcher/monitor`
```
Path: apps/frontend/src/app/dispatcher/monitor/page.tsx
Status: ✅ UI page exists
Needs API endpoints:
  - GET /api/dispatcher/monitor ← Real-time monitoring data
Suggested hooks:
  - useMonitorData() with refetchInterval: 5000 (auto-refresh)
```

### Reports Page: `/dispatcher/reports`
```
Path: apps/frontend/src/app/dispatcher/reports/page.tsx
Status: ✅ UI page exists
Needs API endpoints:
  - GET /api/dispatcher/reports ← List reports
  - GET /api/dispatcher/reports/:reportId ← Report detail
  - POST /api/dispatcher/reports/export ← Export to CSV/PDF
Suggested hooks:
  - useReportsList()
  - useReportDetail()
  - useExportReport()
```

### Admin Audit Page: `/admin/audit`
```
Path: apps/frontend/src/app/admin/audit/page.tsx
Status: ✅ UI page exists
Needs API endpoints:
  - GET /api/admin/audit ← Paginated audit logs
```

### Admin Fleet Stats Page: `/admin/fleet`
```
Path: apps/frontend/src/app/admin/fleet/page.tsx
Status: ✅ UI page exists
Needs API endpoints:
  - GET /api/admin/fleet/stats ← Fleet statistics
  - GET /api/admin/fleet/utilization ← Utilization metrics
```

### Admin Drivers Page: `/admin/drivers`
```
Path: apps/frontend/src/app/admin/drivers/page.tsx
Status: ✅ UI page exists (separate from dispatcher/drivers)
Note: Might be admin view of drivers with different permissions
```

### Driver App Routes: `/driver/*`
```
Path: apps/frontend/src/app/driver/
Status: ✅ Layout exists, page.tsx exists
Needs API endpoints:
  - GET /api/driver/my-route ← Current assigned route
  - PATCH /api/driver/stop/:stopId/complete ← Mark stop complete
  - POST /api/driver/issue ← Report delivery issue
Suggested hooks:
  - useMyRoute()
  - useCompleteStop()
  - useReportIssue()
```

---

# 🎯 Next Steps (If Needed)

## Priority 1: Core Features (Already Done ✅)
- [x] Auth endpoints (except password reset)
- [x] Tasks CRUD
- [x] Drivers CRUD
- [x] Availability management
- [x] Planning & optimization
- [x] Admin users & config
- [x] Geocoding

## Priority 2: Monitoring & Reports (Ready for Integration)
- [ ] Monitor endpoint → `/dispatcher/monitor`
- [ ] Reports endpoints → `/dispatcher/reports`

## Priority 3: Admin Features (Ready for Integration)
- [ ] Audit logs → `/admin/audit`
- [ ] Fleet statistics → `/admin/fleet`

## Priority 4: Driver App (Ready for Integration)
- [ ] Driver route endpoints → `/driver/*`

## Priority 5: Future (Not Yet Implemented)
- [ ] Password reset flow
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Webhooks for real-time updates

---

# 📝 Summary

| Status | Count | Details |
|--------|-------|---------|
| ✅ **Fully Linked** | 29 | All core dispatcher, admin, and auth endpoints |
| 🔄 **Ready for Wiring** | 4+ | Monitor, reports, driver-app endpoints (UI exists, need API) |
| ❌ **Not Linked** | 2 | Password reset (backend not implemented) |
| ⚠️ **Infrastructure** | 1 | Health check (monitoring only, not UI) |

**Overall Coverage: 91% (29/32 endpoints linked)**

All critical business logic is integrated and ready for use. Remaining endpoints are either infrastructure-related or depend on backend features not yet fully implemented.
