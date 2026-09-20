# Backend API Reference & Integration Guide

> **Base Production URL**: `https://attendance-api.ayushbhagat.com`  
> **Interactive OpenAPI / Scalar Documentation**: `https://attendance-api.ayushbhagat.com/scalar`  
> **Runtime**: Bun v1.2+ with [ElysiaJS](https://elysiajs.com)  

---

## 1. Authentication & Role Authorization

The API uses **Better-Auth** for session issuance and role-based access control.

### Authentication Mechanisms:
- **Web Dashboard (Browser)**: Transmits HttpOnly session cookies (`better-auth.session_token`) across requests with `credentials: include`.
- **Native Mobile App**: Transmits the session token via standard `Authorization: Bearer <session_token>` header.

### Institutional Role Hierarchy:
| Role | Identifier | Permitted Operations |
| :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | Full tenant management, CSV bulk roster imports, device rebind approvals, account suspension. |
| **Teacher** | `TEACHER` | Launching attendance sessions, broadcasting WebSocket QR nonces, reviewing rosters, and finalizing overrides. |
| **Student** | `STUDENT` | Scanning rotating QR codes, submitting offline sync queues, viewing historical attendance percentages. |

---

## 2. Standardized Response & Error Envelopes

Every API route returns structured JSON.

### Success Response:
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Envelope:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable explanation of why the request failed",
  "details": [ ... ]
}
```

### Standard Error Codes:
| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | `400` | Malformed request body or schema validation failure (Zod/TypeBox). |
| `PARSE_ERROR` | `400` | Unparsable JSON payload. |
| `UNAUTHORIZED` | `401` | Missing, expired, or invalid session credentials. |
| `FORBIDDEN` | `403` | User does not possess the required role for the resource. |
| `DEVICE_MISMATCH` | `403` | Student attempted to scan using an unbound or foreign phone. |
| `SUSPENDED_USER` | `403` | Student account is locked by the administration. |
| `NOT_FOUND` | `404` | Requested record, session, or route does not exist. |
| `GEOFENCE_VIOLATION`| `400` | Student GPS coordinates fall outside the classroom polygon buffer. |
| `GPS_SPOOFED` | `400` | Scan payload originated from a mock location provider (`mockFlag: true`). |
| `NONCE_EXPIRED` | `400` | Cryptographic QR token timestamp exceeds the 45-second sliding window. |
| `NONCE_REPLAYED` | `400` | Single-use token has already been scanned and consumed in Redis. |
| `CONFLICT` | `400` | Unique constraint violation (e.g., student already enrolled in division). |
| `INTERNAL_SERVER_ERROR` | `500` | Unhandled runtime exception (automatically logged to Winston). |

---

## 3. Endpoints by Domain

### 3.1 Distribution & Updates (Public)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check endpoint (returns `"OK"`). |
| `GET` | `/scalar` | Interactive OpenAPI documentation portal. |
| `GET` | `/api/app/version` | Returns latest APK version, minimum supported version, and release notes. |
| `GET` | `/download/:file` | Streams downloadable binaries (e.g., `secured-attendance.apk`). |
| `GET` | `/updates` | Serves the self-hosted Expo OTA update manifest (`metadata.json`). |
| `GET` | `/updates/*` | Serves Hermes bytecode bundles and exported static assets. |

---

### 3.2 Student Endpoints (`/api/student/*`)
Requires `STUDENT` role authentication.

#### `GET /api/student/profile`
Fetches the student profile, division enrollment, program, and bound device status.

#### `GET /api/student/attendance/history`
Returns historical attendance records aggregated by course, division, and semester.

#### `POST /api/student/attendance/scan`
Submits a dynamic QR code scan for attendance validation.
```json
// Request Body:
{
  "token": "a1b2c3d4e5f6...",      // HMAC-SHA256 token payload from camera
  "deviceUuid": "d8e5df56-f22d...", // Hardware UUID from expo-device
  "gpsLat": 22.5995,               // Current latitude
  "gpsLng": 72.8205,               // Current longitude
  "mockFlag": false,               // Native mock location indicator
  "isOfflineSync": false           // True if queued during network absence
}
```

---

### 3.3 Teacher Endpoints (`/api/teacher/*`)
Requires `TEACHER` role authentication.

#### `GET /api/teacher/schedule/today`
Resolves today's timetable allocations for the authenticated faculty member.

#### `POST /api/teacher/sessions`
Launches an active attendance session for a classroom/lab.
```json
// Request Body:
{
  "timetableId": "tt-123456",
  "buildingId": "cmpica-main",
  "geofenceBufferMeters": 25
}
```

#### `GET /api/teacher/sessions/:id/roster`
Returns the real-time roster of enrolled students and their live scan statuses (`PRESENT`, `ABSENT`).

#### `POST /api/teacher/sessions/:id/finalize`
Atomically closes the session and commits teacher manual overrides inside a Prisma transaction.
```json
// Request Body:
{
  "manualOverrides": [
    { "studentId": "std-001", "status": "PRESENT", "reason": "Camera hardware fault" },
    { "studentId": "std-004", "status": "ABSENT", "reason": "Left classroom early" }
  ]
}
```

---

### 3.4 Admin Endpoints (`/api/admin/*`)
Requires `SUPER_ADMIN` role authentication.

#### `GET /api/admin/users`
Lists campus users with search, role filters, and pagination.

#### `POST /api/admin/users/bulk-import`
Imports student, teacher, and timetable rosters from CSV with header auto-mapping.
Supports preview mode before committing changes to the database.

#### `POST /api/admin/users/:id/device-rebind`
Clears a student's bound device UUID, allowing them to bind a new physical phone on next login.

#### `POST /api/admin/users/:id/suspend`
Locks a student or teacher account, immediately revoking active sessions.
