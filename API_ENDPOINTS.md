# TMS API Endpoints Specification

This document details all backend API endpoints required to support the TMS frontend application. Endpoints are organized by feature area and role.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Driver Dashboard](#2-driver-dashboard)
3. [Admin Dashboard](#3-admin-dashboard)
4. [Dispatcher Dashboard](#4-dispatcher-dashboard)

---

## 1. Authentication

### 1.1 Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user credentials and return session token + user profile.

**Request Body:**
```json
{
  "email": "admin@tms.dz",
  "password": "password123",
  "role": "admin" // Optional: admin | dispatcher | driver
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "1",
      "name": "Karim Benali",
      "email": "admin@tms.dz",
      "role": "admin",
      "phone": "+213 555 0101",
      "avatar": null
    },
    "expiresIn": 3600
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### 1.2 Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Invalidate current session token.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.3 Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Exchange refresh token for new access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new_access_token",
    "expiresIn": 3600
  }
}
```

---

### 1.4 Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Retrieve current authenticated user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Karim Benali",
    "email": "admin@tms.dz",
    "role": "admin",
    "phone": "+213 555 0101",
    "avatar": null,
    "lastLogin": "2026-03-01T09:45:12Z"
  }
}
```

---

### 1.5 Reset Password Request

**Endpoint:** `POST /api/auth/password-reset`

**Description:** Request password reset link via email.

**Request Body:**
```json
{
  "email": "admin@tms.dz"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

---

### 1.6 Reset Password Confirm

**Endpoint:** `POST /api/auth/password-reset/confirm`

**Description:** Confirm password reset with token.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## 2. Driver Dashboard

### 2.1 Get Driver Route

**Endpoint:** `GET /api/driver/route`

**Description:** Get current driver's active route with all stops and progress.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "driver": {
      "id": "3",
      "name": "Youcef Merah",
      "phone": "+213 555 0103"
    },
    "vehicle": {
      "id": "1",
      "plate": "16-A-4521",
      "make": "Renault",
      "model": "Master"
    },
    "shift": {
      "start": "08:00",
      "end": "17:00"
    },
    "depot": "Algiers Central",
    "stats": {
      "totalStops": 6,
      "completedStops": 3,
      "remainingStops": 3,
      "totalDistance": 68,
      "remainingDistance": 35,
      "estimatedCompletion": "14:30"
    },
    "stops": [
      {
        "num": 1,
        "taskId": "TSK-101",
        "type": "pickup",
        "address": "Algiers Airport — Terminal 1",
        "location": {
          "lat": 36.691,
          "lng": 3.215
        },
        "scheduledTime": "08:30",
        "actualTime": "08:28",
        "status": "done",
        "contact": {
          "name": "M. Khalil",
          "phone": "+213 555 1001"
        },
        "instructions": "Meet at arrivals gate",
        "serviceTime": 10,
        "capacity": 2
      },
      {
        "num": 4,
        "taskId": "TSK-118",
        "type": "dropoff",
        "address": "Client Office Hydra — 12 Rue Didouche",
        "location": {
          "lat": 36.755,
          "lng": 3.058
        },
        "scheduledTime": "11:30",
        "actualTime": null,
        "status": "current",
        "contact": {
          "name": "Samira R.",
          "phone": "+213 555 1004"
        },
        "instructions": "Package pickup — 2 boxes, fragile",
        "serviceTime": 10,
        "capacity": 5
      }
    ]
  }
}
```

---

### 2.2 Update Stop Status

**Endpoint:** `PATCH /api/driver/stops/:stopNum/status`

**Description:** Mark a stop as completed, skipped, or report issue.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "completed", // completed | skipped | issue
  "actualTime": "11:35",
  "notes": "Customer not available, left package at reception",
  "signature": "base64_encoded_signature_image",
  "photo": "base64_encoded_photo"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stopNum": 4,
    "status": "completed",
    "actualTime": "11:35",
    "nextStop": {
      "num": 5,
      "address": "Warehouse A — Zone Industrielle",
      "eta": "12:45"
    }
  }
}
```

---

### 2.3 Report Issue

**Endpoint:** `POST /api/driver/issues`

**Description:** Report an issue during route execution (delay, accident, vehicle problem, etc.).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "type": "delay", // delay | accident | vehicle_issue | customer_issue | other
  "severity": "medium", // low | medium | high | critical
  "description": "Traffic jam on RN5, estimated +15 minutes delay",
  "location": {
    "lat": 36.7538,
    "lng": 3.0588
  },
  "affectedStop": 5,
  "photos": ["base64_image_1", "base64_image_2"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "issueId": "ISS-001",
    "status": "reported",
    "assignedTo": "dispatcher",
    "createdAt": "2026-03-01T11:28:00Z"
  }
}
```

---

### 2.4 Get Navigation to Next Stop

**Endpoint:** `GET /api/driver/navigation/next`

**Description:** Get turn-by-turn navigation to the next stop.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "destination": {
      "stopNum": 5,
      "address": "Warehouse A — Zone Industrielle",
      "location": {
        "lat": 36.6914,
        "lng": 3.2154
      }
    },
    "route": {
      "distance": 12.5,
      "duration": 22,
      "steps": [
        {
          "instruction": "Head north on Rue Didouche Mourad",
          "distance": 0.5,
          "duration": 2
        },
        {
          "instruction": "Turn right onto Boulevard Mohamed V",
          "distance": 3.2,
          "duration": 8
        }
      ],
      "polyline": "encoded_polyline_string"
    }
  }
}
```

---

### 2.5 Update Driver Location

**Endpoint:** `POST /api/driver/location`

**Description:** Real-time location update (called periodically during shift).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "lat": 36.7538,
  "lng": 3.0588,
  "heading": 45,
  "speed": 35,
  "timestamp": "2026-03-01T11:32:15Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Location updated"
}
```

---

### 2.6 Call Contact

**Endpoint:** `POST /api/driver/calls`

**Description:** Log a call to customer/dispatcher (for analytics).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "contactType": "customer", // customer | dispatcher | support
  "contactPhone": "+213 555 1004",
  "stopNum": 4,
  "duration": 45
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "callId": "CALL-001",
    "loggedAt": "2026-03-01T11:30:00Z"
  }
}
```

---

## 3. Admin Dashboard

### 3.1 Get Dashboard Stats

**Endpoint:** `GET /api/admin/dashboard/stats`

**Description:** Get overview statistics for admin dashboard.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 28,
      "active": 25,
      "byRole": {
        "admin": 2,
        "dispatcher": 8,
        "driver": 18
      },
      "change": "+3 this month"
    },
    "vehicles": {
      "total": 15,
      "active": 13,
      "maintenance": 2,
      "retired": 0
    },
    "systemUptime": {
      "percentage": 99.8,
      "period": "Last 30 days",
      "lastDowntime": "2026-02-15T03:45:00Z"
    },
    "auditEvents": {
      "total": 1247,
      "today": 43,
      "critical": 2
    }
  }
}
```

---

### 3.2 Get System Health

**Endpoint:** `GET /api/admin/health`

**Description:** Get health status of all system services.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overall": "healthy", // healthy | degraded | critical
    "services": [
      {
        "name": "PostgreSQL Database",
        "status": "healthy",
        "responseTime": 15,
        "uptime": 99.99,
        "details": {
          "connections": 12,
          "maxConnections": 100,
          "storageUsed": 2.4,
          "storageTotal": 50
        },
        "metrics": {
          "cpu": 8,
          "memory": 42
        }
      },
      {
        "name": "OSRM Routing Engine",
        "status": "healthy",
        "responseTime": 42,
        "uptime": 99.95,
        "details": {
          "activeMatrices": 5,
          "region": "Algeria"
        },
        "metrics": {
          "cpu": 15,
          "memory": 68
        }
      },
      {
        "name": "Geocoding Service",
        "status": "degraded",
        "responseTime": 340,
        "uptime": 97.2,
        "details": {
          "successRate": 78,
          "failuresToday": 156,
          "lastError": "Rate limit exceeded"
        },
        "metrics": {
          "cpu": 22,
          "memory": 55
        }
      }
    ],
    "lastChecked": "2026-03-01T11:45:00Z"
  }
}
```

---

### 3.3 Restart Service

**Endpoint:** `POST /api/admin/services/:serviceName/restart`

**Description:** Restart a system service.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service 'Geocoding Service' restart initiated",
  "data": {
    "serviceName": "Geocoding Service",
    "status": "restarting",
    "estimatedTime": 30
  }
}
```

---

### 3.4 Get Recent Activity

**Endpoint:** `GET /api/admin/activity`

**Description:** Get recent system activity/events.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (number, default: 20)
- `type` (string, optional: publish | alert | create | import | warning)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "EVT-001",
        "user": "Amira Hadj",
        "action": "Published daily plan",
        "timestamp": "2026-03-01T09:45:00Z",
        "type": "publish",
        "metadata": {
          "planId": "PLN-2026-0301-v2"
        }
      },
      {
        "id": "EVT-002",
        "user": "System",
        "action": "Driver license expiry alert: Samir K.",
        "timestamp": "2026-03-01T09:30:00Z",
        "type": "alert",
        "metadata": {
          "driverId": "DRV-008",
          "expiryDate": "2026-03-20"
        }
      }
    ],
    "total": 1247,
    "page": 1,
    "limit": 20
  }
}
```

---

### 3.5 List Users

**Endpoint:** `GET /api/admin/users`

**Description:** Get list of all users with filtering and pagination.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `role` (string, optional: admin | dispatcher | driver)
- `status` (string, optional: active | inactive)
- `search` (string, optional: search by name, email, phone)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "1",
        "name": "Karim Benali",
        "email": "admin@tms.dz",
        "phone": "+213 555 0101",
        "role": "admin",
        "status": "active",
        "lastLogin": "2026-03-01T09:45:12Z",
        "createdAt": "2025-01-15T08:00:00Z"
      }
    ],
    "total": 28,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

### 3.6 Create User

**Endpoint:** `POST /api/admin/users`

**Description:** Create a new user account.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Ali Benali",
  "email": "ali@tms.dz",
  "phone": "+213 555 0999",
  "role": "driver",
  "password": "temporaryPassword123",
  "sendWelcomeEmail": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "29",
    "name": "Ali Benali",
    "email": "ali@tms.dz",
    "phone": "+213 555 0999",
    "role": "driver",
    "status": "active",
    "createdAt": "2026-03-01T11:50:00Z"
  }
}
```

---

### 3.7 Update User

**Endpoint:** `PATCH /api/admin/users/:userId`

**Description:** Update user details.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Ali Benali Updated",
  "phone": "+213 555 0998",
  "role": "dispatcher",
  "status": "active"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "29",
    "name": "Ali Benali Updated",
    "email": "ali@tms.dz",
    "phone": "+213 555 0998",
    "role": "dispatcher",
    "status": "active",
    "updatedAt": "2026-03-01T11:55:00Z"
  }
}
```

---

### 3.8 Delete User

**Endpoint:** `DELETE /api/admin/users/:userId`

**Description:** Soft delete a user (mark as inactive).

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 3.9 Reset User Password

**Endpoint:** `POST /api/admin/users/:userId/reset-password`

**Description:** Reset a user's password and send them a reset link.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "sendEmail": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to user's email"
}
```

---

### 3.10 List Vehicles

**Endpoint:** `GET /api/admin/fleet`

**Description:** Get list of all vehicles with filtering and pagination.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `status` (string, optional: active | maintenance | retired)
- `type` (string, optional: Van | Truck | Car | Bus | Motorcycle)
- `search` (string, optional: search by plate, make, model)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "1",
        "plate": "16-A-4521",
        "type": "Van",
        "make": "Renault",
        "model": "Master",
        "year": 2023,
        "status": "active",
        "capacity": {
          "passengers": 3,
          "weight": 1200
        },
        "depot": "Algiers Central",
        "assignedDriver": {
          "id": "3",
          "name": "Youcef Merah"
        },
        "mileage": 45200,
        "lastService": "2026-02-15",
        "nextService": "2026-05-15"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 50
  }
}
```

---

### 3.11 Create Vehicle

**Endpoint:** `POST /api/admin/fleet`

**Description:** Register a new vehicle.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "plate": "16-A-9999",
  "type": "Van",
  "make": "Renault",
  "model": "Master",
  "year": 2024,
  "capacity": {
    "passengers": 3,
    "weight": 1200
  },
  "depot": "Algiers Central"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "16",
    "plate": "16-A-9999",
    "type": "Van",
    "make": "Renault",
    "model": "Master",
    "year": 2024,
    "status": "active",
    "capacity": {
      "passengers": 3,
      "weight": 1200
    },
    "depot": "Algiers Central",
    "createdAt": "2026-03-01T12:00:00Z"
  }
}
```

---

### 3.12 Update Vehicle

**Endpoint:** `PATCH /api/admin/fleet/:vehicleId`

**Description:** Update vehicle details.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "maintenance",
  "depot": "Blida Depot",
  "mileage": 45300
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "plate": "16-A-4521",
    "status": "maintenance",
    "depot": "Blida Depot",
    "mileage": 45300,
    "updatedAt": "2026-03-01T12:05:00Z"
  }
}
```

---

### 3.13 Delete Vehicle

**Endpoint:** `DELETE /api/admin/fleet/:vehicleId`

**Description:** Mark vehicle as retired.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vehicle retired successfully"
}
```

---

### 3.14 List Drivers

**Endpoint:** `GET /api/admin/drivers`

**Description:** Get list of all drivers with license and performance data.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `status` (string, optional: active | inactive)
- `depot` (string, optional: filter by depot)
- `search` (string, optional: search by name, phone, license)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "drivers": [
      {
        "id": "3",
        "name": "Youcef Merah",
        "phone": "+213 555 0103",
        "email": "driver@tms.dz",
        "license": {
          "number": "DZ-3456789",
          "expiryDate": "2026-08-15",
          "isExpiring": false
        },
        "vehicle": {
          "id": "1",
          "plate": "16-A-4521"
        },
        "depot": "Algiers Central",
        "shift": {
          "start": "08:00",
          "end": "17:00"
        },
        "status": "active",
        "performance": {
          "onTimeRate": 96,
          "completionRate": 98,
          "avgStopsPerDay": 6.2,
          "incidents": 1
        }
      }
    ],
    "total": 18,
    "page": 1,
    "limit": 50
  }
}
```

---

### 3.15 Get Audit Logs

**Endpoint:** `GET /api/admin/audit`

**Description:** Get audit log entries with filtering.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 100)
- `action` (string, optional: Create | Update | Delete | Publish | Login | Import)
- `entity` (string, optional: Plan | Route | Task | Vehicle | Driver | User | Session | Config)
- `userId` (string, optional: filter by user)
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)
- `search` (string, optional: search in description, entity ID)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "LOG-001",
        "timestamp": "2026-03-01T09:45:12Z",
        "user": {
          "id": "2",
          "name": "Amira Hadj",
          "role": "dispatcher"
        },
        "action": "Publish",
        "entity": "Plan",
        "entityId": "PLN-2026-0301-v2",
        "description": "Published daily plan version 2",
        "ip": "192.168.1.42",
        "userAgent": "Mozilla/5.0...",
        "changes": {
          "before": { "status": "draft" },
          "after": { "status": "published" }
        }
      }
    ],
    "total": 1247,
    "page": 1,
    "limit": 100
  }
}
```

---

### 3.16 Export Audit Logs

**Endpoint:** `GET /api/admin/audit/export`

**Description:** Export audit logs as CSV.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:** (same as 3.15)

**Response:** CSV file download

---

### 3.17 Get System Configuration

**Endpoint:** `GET /api/admin/config`

**Description:** Get all system configuration parameters.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "optimization": {
      "defaultTimeWindowDuration": 2,
      "solverTimeLimit": 60,
      "depotReturnPolicy": "always",
      "capacityUnit": "kg"
    },
    "routing": {
      "defaultTravelSpeed": 40,
      "roadTypePreference": "mixed",
      "matrixCacheDuration": 24,
      "rushHourMultipliers": true
    },
    "business": {
      "maxStopsPerDriver": 15,
      "defaultPickupServiceTime": 10,
      "defaultDropoffServiceTime": 5,
      "priorityWeighting": "default"
    },
    "system": {
      "sessionTimeout": 30,
      "passwordExpiry": 90,
      "auditLogRetention": 12,
      "requireComplexPasswords": true
    }
  }
}
```

---

### 3.18 Update System Configuration

**Endpoint:** `PATCH /api/admin/config`

**Description:** Update system configuration parameters.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "optimization": {
    "solverTimeLimit": 90
  },
  "routing": {
    "defaultTravelSpeed": 45
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "updatedFields": ["optimization.solverTimeLimit", "routing.defaultTravelSpeed"]
  }
}
```

---

## 4. Dispatcher Dashboard

### 4.1 Get Dashboard Overview

**Endpoint:** `GET /api/dispatcher/dashboard`

**Description:** Get dispatcher dashboard overview with today's stats and alerts.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-01",
    "stats": {
      "tasksDueToday": 47,
      "tasksByPriority": {
        "urgent": 12,
        "high": 18,
        "normal": 15,
        "low": 2
      },
      "driversAvailable": 12,
      "driversTotal": 15,
      "driversOnLeave": 3,
      "yesterdayCompletion": {
        "rate": 94,
        "completed": 45,
        "total": 48
      },
      "unassignedTasks": 5
    },
    "alerts": [
      {
        "id": "ALERT-001",
        "type": "urgent",
        "message": "5 unassigned tasks from yesterday need resolution",
        "action": "View Tasks",
        "link": "/dispatcher/tasks?status=draft"
      },
      {
        "id": "ALERT-002",
        "type": "warning",
        "message": "Driver Fatima Zahra marked as sick — 3 tasks need reassignment",
        "action": "Reassign",
        "link": "/dispatcher/availability"
      }
    ],
    "timeline": [
      {
        "time": "07:00",
        "event": "Morning preparation",
        "status": "done"
      },
      {
        "time": "09:00",
        "event": "Run optimizer & review plan",
        "status": "current"
      },
      {
        "time": "09:30",
        "event": "Publish routes & brief drivers",
        "status": "pending"
      }
    ]
  }
}
```

---

### 4.2 List Tasks

**Endpoint:** `GET /api/dispatcher/tasks`

**Description:** Get list of all tasks with filtering and pagination.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 100)
- `date` (ISO date, default: today)
- `status` (string, optional: draft | planned | assigned | in_progress | completed | cancelled)
- `priority` (string, optional: urgent | high | normal | low)
- `type` (string, optional: person | delivery)
- `driver` (string, optional: filter by driver ID)
- `search` (string, optional: search by ID, addresses, contact)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "TSK-101",
        "type": "person",
        "pickup": {
          "address": "Algiers Airport",
          "location": { "lat": 36.691, "lng": 3.215 },
          "timeWindow": {
            "earliest": "08:00",
            "latest": "09:00"
          }
        },
        "dropoff": {
          "address": "Hotel Sofitel",
          "location": { "lat": 36.753, "lng": 3.058 },
          "deadline": "10:00"
        },
        "priority": "urgent",
        "status": "assigned",
        "capacity": 2,
        "contact": {
          "name": "M. Khalil",
          "phone": "+213 555 1001"
        },
        "driver": {
          "id": "3",
          "name": "Youcef M."
        },
        "instructions": "Meet at arrivals gate",
        "createdAt": "2026-02-28T18:00:00Z",
        "updatedAt": "2026-03-01T08:00:00Z"
      }
    ],
    "total": 47,
    "page": 1,
    "limit": 100
  }
}
```

---

### 4.3 Create Task

**Endpoint:** `POST /api/dispatcher/tasks`

**Description:** Create a new task.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "type": "person",
  "pickup": {
    "address": "Algiers Airport — Terminal 1",
    "timeWindow": {
      "earliest": "08:00",
      "latest": "09:00"
    }
  },
  "dropoff": {
    "address": "Hotel Sofitel Algiers",
    "deadline": "10:00"
  },
  "priority": "urgent",
  "capacity": 2,
  "contact": {
    "name": "M. Khalil",
    "phone": "+213 555 1001"
  },
  "instructions": "Meet at arrivals gate",
  "serviceTime": 10
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "TSK-149",
    "type": "person",
    "pickup": {
      "address": "Algiers Airport — Terminal 1",
      "location": { "lat": 36.691, "lng": 3.215 },
      "geocodingStatus": "success",
      "timeWindow": {
        "earliest": "08:00",
        "latest": "09:00"
      }
    },
    "dropoff": {
      "address": "Hotel Sofitel Algiers",
      "location": { "lat": 36.753, "lng": 3.058 },
      "geocodingStatus": "success",
      "deadline": "10:00"
    },
    "priority": "urgent",
    "status": "draft",
    "capacity": 2,
    "contact": {
      "name": "M. Khalil",
      "phone": "+213 555 1001"
    },
    "instructions": "Meet at arrivals gate",
    "createdAt": "2026-03-01T12:10:00Z"
  }
}
```

---

### 4.4 Update Task

**Endpoint:** `PATCH /api/dispatcher/tasks/:taskId`

**Description:** Update task details.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "priority": "high",
  "pickup": {
    "timeWindow": {
      "earliest": "08:30",
      "latest": "09:30"
    }
  },
  "instructions": "Meet at arrivals gate — Gate 3"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "TSK-149",
    "priority": "high",
    "pickup": {
      "address": "Algiers Airport — Terminal 1",
      "location": { "lat": 36.691, "lng": 3.215 },
      "timeWindow": {
        "earliest": "08:30",
        "latest": "09:30"
      }
    },
    "instructions": "Meet at arrivals gate — Gate 3",
    "updatedAt": "2026-03-01T12:15:00Z"
  }
}
```

---

### 4.5 Delete Task

**Endpoint:** `DELETE /api/dispatcher/tasks/:taskId`

**Description:** Cancel/delete a task.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Task cancelled successfully"
}
```

---

### 4.6 Bulk Import Tasks

**Endpoint:** `POST /api/dispatcher/tasks/import`

**Description:** Import multiple tasks from CSV.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body:**
```
file: tasks.csv (CSV file with columns: type, pickupAddress, dropoffAddress, pickupEarliest, pickupLatest, deadline, priority, capacity, contact, phone, instructions)
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "imported": 32,
    "failed": 3,
    "errors": [
      {
        "row": 5,
        "reason": "Invalid address: Unable to geocode 'Rue Inconnu'"
      },
      {
        "row": 12,
        "reason": "Invalid time window: pickupEarliest > pickupLatest"
      },
      {
        "row": 20,
        "reason": "Missing required field: contact"
      }
    ],
    "taskIds": ["TSK-150", "TSK-151", "..."]
  }
}
```

---

### 4.7 Get Driver Availability

**Endpoint:** `GET /api/dispatcher/availability`

**Description:** Get weekly availability calendar for all drivers.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `week` (ISO date, start of week, default: current week)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "week": "2026-03-01",
    "drivers": [
      {
        "id": "3",
        "name": "Youcef Merah",
        "depot": "Algiers Central",
        "vehicle": "16-A-4521",
        "defaultShift": {
          "start": "08:00",
          "end": "17:00"
        },
        "availability": {
          "Mon": {
            "available": true,
            "shift": { "start": "08:00", "end": "17:00" },
            "modified": false
          },
          "Tue": {
            "available": true,
            "shift": { "start": "08:00", "end": "17:00" },
            "modified": false
          },
          "Wed": {
            "available": true,
            "shift": { "start": "08:00", "end": "17:00" },
            "modified": false
          },
          "Thu": {
            "available": true,
            "shift": { "start": "08:00", "end": "17:00" },
            "modified": false
          },
          "Fri": {
            "available": true,
            "shift": { "start": "08:00", "end": "17:00" },
            "modified": false
          },
          "Sat": {
            "available": true,
            "shift": { "start": "08:00", "end": "13:00" },
            "modified": true
          },
          "Sun": {
            "available": false,
            "shift": null,
            "modified": false
          }
        }
      }
    ],
    "summary": {
      "totalDrivers": 15,
      "availableDrivers": 12,
      "totalShiftHours": 96
    }
  }
}
```

---

### 4.8 Update Driver Availability

**Endpoint:** `PATCH /api/dispatcher/availability/:driverId`

**Description:** Update a driver's availability for the week.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "week": "2026-03-01",
  "availability": {
    "Mon": {
      "available": false,
      "reason": "Sick leave"
    },
    "Tue": {
      "available": false,
      "reason": "Sick leave"
    },
    "Wed": {
      "available": true,
      "shift": { "start": "09:00", "end": "17:00" }
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Availability updated",
  "data": {
    "driverId": "3",
    "week": "2026-03-01",
    "updatedDays": ["Mon", "Tue", "Wed"]
  }
}
```

---

### 4.9 Generate Optimization Plan

**Endpoint:** `POST /api/dispatcher/planning/optimize`

**Description:** Run the route optimization algorithm to generate a plan.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "date": "2026-03-01",
  "includeUncompletedTasks": true,
  "drivers": "all", // "all" | ["driver_id_1", "driver_id_2", ...]
  "config": {
    "startPolicy": "depot", // "depot" | "flexible"
    "returnToDepot": true,
    "enableCapacityConstraints": true,
    "maxStopsPerDriver": 15,
    "objective": "standard", // "standard" | "balance"
    "respectTimeWindows": true
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Optimization started",
  "data": {
    "jobId": "OPT-JOB-001",
    "status": "running",
    "estimatedTime": 45,
    "statusUrl": "/api/dispatcher/planning/status/OPT-JOB-001"
  }
}
```

---

### 4.10 Get Optimization Status

**Endpoint:** `GET /api/dispatcher/planning/status/:jobId`

**Description:** Get status of a running optimization job.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "OPT-JOB-001",
    "status": "running", // running | completed | failed
    "progress": 65,
    "currentStep": "Building Routes",
    "startedAt": "2026-03-01T09:15:00Z",
    "estimatedCompletion": "2026-03-01T09:16:30Z"
  }
}
```

**When completed:**
```json
{
  "success": true,
  "data": {
    "jobId": "OPT-JOB-001",
    "status": "completed",
    "progress": 100,
    "planId": "PLN-2026-0301-v1",
    "completedAt": "2026-03-01T09:15:45Z",
    "planUrl": "/api/dispatcher/planning/plans/PLN-2026-0301-v1"
  }
}
```

---

### 4.11 Get Optimization Plan

**Endpoint:** `GET /api/dispatcher/planning/plans/:planId`

**Description:** Get details of a generated plan.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "PLN-2026-0301-v1",
    "date": "2026-03-01",
    "version": 1,
    "status": "draft", // draft | published | archived
    "stats": {
      "totalTasks": 47,
      "assigned": 44,
      "unassigned": 3,
      "assignmentRate": 94,
      "totalTravelTime": 725, // minutes
      "totalDistance": 246, // km
      "driversUsed": 4,
      "avgUtilization": 77
    },
    "routes": [
      {
        "driver": {
          "id": "3",
          "name": "Youcef Merah"
        },
        "vehicle": {
          "id": "1",
          "plate": "16-A-4521"
        },
        "stops": 6,
        "duration": 260, // minutes
        "distance": 68, // km
        "utilization": 85,
        "tasks": [
          {
            "taskId": "TSK-101",
            "stopNum": 1,
            "type": "pickup",
            "estimatedArrival": "08:30",
            "serviceTime": 10
          },
          {
            "taskId": "TSK-101",
            "stopNum": 2,
            "type": "dropoff",
            "estimatedArrival": "09:15",
            "serviceTime": 5
          }
        ]
      }
    ],
    "unassigned": [
      {
        "taskId": "TSK-142",
        "reason": "Time window conflict — no driver available 06:00-06:30"
      },
      {
        "taskId": "TSK-145",
        "reason": "Capacity exceeded — requires 20 units, max vehicle capacity 15"
      },
      {
        "taskId": "TSK-148",
        "reason": "Address not geocoded — Rue Inconnu, Algiers"
      }
    ],
    "createdAt": "2026-03-01T09:15:45Z"
  }
}
```

---

### 4.12 Publish Plan

**Endpoint:** `POST /api/dispatcher/planning/plans/:planId/publish`

**Description:** Publish a plan to make it active for drivers.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Plan published successfully",
  "data": {
    "planId": "PLN-2026-0301-v1",
    "status": "published",
    "publishedAt": "2026-03-01T09:45:00Z",
    "notifiedDrivers": 4
  }
}
```

---

### 4.13 Manually Assign Task

**Endpoint:** `POST /api/dispatcher/tasks/:taskId/assign`

**Description:** Manually assign an unassigned task to a driver.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "driverId": "3",
  "insertPosition": 3, // Insert as stop #3 in route
  "estimatedArrival": "11:30"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Task assigned successfully",
  "data": {
    "taskId": "TSK-142",
    "driverId": "3",
    "stopNum": 3,
    "route": {
      "totalStops": 7,
      "totalDistance": 75,
      "totalDuration": 285,
      "utilization": 92
    }
  }
}
```

---

### 4.14 Get Execution Monitor

**Endpoint:** `GET /api/dispatcher/monitor`

**Description:** Get real-time execution monitoring data.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `date` (ISO date, default: today)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-01",
    "overview": {
      "total": 44,
      "completed": 28,
      "inProgress": 12,
      "pending": 4,
      "onTimeRate": 91,
      "delays": 3
    },
    "drivers": [
      {
        "id": "3",
        "name": "Youcef Merah",
        "phone": "+213 555 0103",
        "vehicle": "16-A-4521",
        "status": "on_route", // on_route | at_stop | delayed | completed | break
        "currentStop": {
          "stopNum": 4,
          "taskId": "TSK-118",
          "address": "Client Office Hydra",
          "scheduledArrival": "11:30",
          "estimatedArrival": "11:32"
        },
        "progress": {
          "completed": 3,
          "total": 6
        },
        "nextEta": "11:45",
        "location": {
          "lat": 36.7538,
          "lng": 3.0588,
          "updatedAt": "2026-03-01T11:32:00Z"
        }
      }
    ],
    "recentEvents": [
      {
        "time": "11:32",
        "driverId": "3",
        "driverName": "Youcef M.",
        "event": "Completed stop 3 — Hotel Sofitel",
        "type": "success"
      },
      {
        "time": "11:28",
        "driverId": "4",
        "driverName": "Mohamed A.",
        "event": "Reported delay: Traffic on RN5 (+15min)",
        "type": "warning"
      }
    ],
    "lastUpdated": "2026-03-01T11:33:00Z"
  }
}
```

---

### 4.15 Get Reports

**Endpoint:** `GET /api/dispatcher/reports`

**Description:** Get operational reports and analytics.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (string: "1d" | "7d" | "30d", default: "7d")
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "startDate": "2026-02-23",
    "endDate": "2026-03-01",
    "kpis": {
      "avgDailyTasks": 45,
      "avgCompletionRate": 93,
      "avgPlanTime": 42, // seconds
      "exceptionRate": 6
    },
    "dailySummary": [
      {
        "date": "2026-03-01",
        "tasks": 47,
        "completed": 28,
        "rate": 60,
        "status": "In Progress"
      },
      {
        "date": "2026-02-28",
        "tasks": 48,
        "completed": 45,
        "rate": 94,
        "status": "Closed"
      }
    ],
    "driverPerformance": [
      {
        "driverId": "3",
        "name": "Youcef Merah",
        "avgStopsPerDay": 6.2,
        "onTimeRate": 96,
        "incidents": 1,
        "completionRate": 98
      }
    ],
    "unassignedAnalysis": {
      "total": 30,
      "byReason": [
        {
          "reason": "Time Window Conflict",
          "count": 12,
          "percentage": 40
        },
        {
          "reason": "Capacity Exceeded",
          "count": 8,
          "percentage": 27
        },
        {
          "reason": "Geocoding Failure",
          "count": 6,
          "percentage": 20
        },
        {
          "reason": "Shift Too Short",
          "count": 4,
          "percentage": 13
        }
      ]
    }
  }
}
```

---

### 4.16 Export Report

**Endpoint:** `GET /api/dispatcher/reports/export`

**Description:** Export reports as CSV or PDF.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (string: "1d" | "7d" | "30d")
- `format` (string: "csv" | "pdf", default: "csv")
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)

**Response:** File download (CSV or PDF)

---

## Common Response Patterns

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... } // Optional additional context
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

---

## Common Error Codes

- `UNAUTHORIZED` - Missing or invalid authentication token
- `FORBIDDEN` - User lacks permission for this operation
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request body validation failed
- `DUPLICATE` - Resource already exists
- `CONFLICT` - Operation conflicts with current state
- `RATE_LIMIT` - Too many requests
- `SERVER_ERROR` - Internal server error

---

## Authentication

All endpoints except `/api/auth/login`, `/api/auth/password-reset`, and `/api/auth/password-reset/confirm` require authentication via JWT Bearer token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens expire after 1 hour (3600 seconds). Use the refresh token endpoint to obtain a new access token without re-authenticating.

---

## Rate Limiting

- **Default:** 100 requests per minute per user
- **Auth endpoints:** 10 requests per minute per IP
- **Bulk operations:** 5 requests per minute per user

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709291400
```

---

## WebSocket Events (Real-time Updates)

### Connection
```
ws://api.tms.dz/ws?token={jwt_token}
```

### Events

#### Driver Location Update
```json
{
  "event": "driver.location",
  "data": {
    "driverId": "3",
    "lat": 36.7538,
    "lng": 3.0588,
    "heading": 45,
    "speed": 35,
    "timestamp": "2026-03-01T11:32:15Z"
  }
}
```

#### Stop Completed
```json
{
  "event": "stop.completed",
  "data": {
    "driverId": "3",
    "stopNum": 3,
    "taskId": "TSK-101",
    "actualTime": "09:20",
    "timestamp": "2026-03-01T09:20:00Z"
  }
}
```

#### Issue Reported
```json
{
  "event": "issue.reported",
  "data": {
    "issueId": "ISS-001",
    "driverId": "4",
    "type": "delay",
    "severity": "medium",
    "description": "Traffic jam on RN5, +15 minutes delay",
    "timestamp": "2026-03-01T11:28:00Z"
  }
}
```

#### Plan Published
```json
{
  "event": "plan.published",
  "data": {
    "planId": "PLN-2026-0301-v2",
    "date": "2026-03-01",
    "affectedDrivers": ["3", "5", "7", "8"],
    "timestamp": "2026-03-01T09:45:00Z"
  }
}
```

---

## Notes

1. **All timestamps** are in ISO 8601 format (UTC): `2026-03-01T09:45:12Z`
2. **All distances** are in kilometers
3. **All durations** are in minutes unless otherwise specified
4. **All coordinates** use WGS84 (lat, lng)
5. **All IDs** are strings (supports UUID, sequential, or custom formats)
6. **Soft deletes** are preferred — resources are marked as inactive/cancelled rather than removed
7. **Audit logging** is automatic for all Create/Update/Delete operations
8. **Geocoding** happens automatically on task creation/update (addresses → coordinates)
9. **File uploads** use multipart/form-data
10. **Exports** return appropriate content-type headers for file downloads

---

## Environment URLs

- **Development:** `http://localhost:8000/api`
- **Staging:** `https://staging-api.tms.dz/api`
- **Production:** `https://api.tms.dz/api`

---

**Last Updated:** March 3, 2026  
**Version:** 1.0.0  
**Contact:** tech@tms.dz
