# Database Architecture & Prisma Multi-Schema Specification

> **Database Engine**: PostgreSQL 16 (Hosted on [NeonDB](https://neon.tech))  
> **ORM & Migration Tool**: [Prisma ORM v7](https://www.prisma.io) with Multi-Schema Support  
> **Database Workspace**: `packages/db/`  

---

## 1. Multi-Schema Architecture

The database schema is partitioned into **8 isolated domain schemas** within PostgreSQL using Prisma's multi-file schema feature (`prisma/schema/`):

```text
packages/db/prisma/schema/
├── schema.prisma       # Global Datasource, Generator & PostgreSQL Extensions
├── auth.prisma         # Better-Auth Users, Sessions, Accounts & Verification Tokens
├── academic.prisma     # Institutes, Departments, Programs, Batches, Divisions & Courses
├── profiles.prisma     # Extended Student & Faculty Profiles, Enrollment Records
├── campus.prisma       # Buildings, Rooms, Labs & Polygon Geofence Coordinates
├── timetable.prisma    # Weekly Academic Schedule Slots & Room Allocations
├── attendance.prisma   # Active Attendance Sessions, Scanned Records & Overrides
└── audit.prisma        # Security Anomaly Alerts, Device Bindings & Audit Events
```

---

## 2. Institutional Entity Relationship Model

```text
Institute (e.g., CMPICA, CSPIT)
    │
    └── Department (Computer Applications)
            │
            └── Program (e.g., MSIT, MCA, B.Tech CSE)
                    │
                    └── Batch (e.g., 2024-2026)
                            │
                            ├── Division (Div-A, Div-B) ─── Enrolled Students
                            │
                            └── Course (e.g., MSIT101 Advanced Web Tech)
                                    │
                                    └── TimetableSlot (Wednesday 10:00 AM)
                                            │
                                            ├── Assigned Teacher
                                            ├── Assigned Room / Lab (with Polygon Geofence)
                                            │
                                            └── AttendanceSession
                                                    │
                                                    ├── Dynamic HMAC Tokens
                                                    ├── AttendanceRecords (Present / Late)
                                                    └── AnomalyAlerts (Flagged Proxies)
```

---

## 3. Schema Breakdown & Core Models

### 3.1 Academic Schema (`academic.prisma`)
- `Institute`: High-level college entity (e.g., `CMPICA`, `DEPSTAR`).
- `Department`: Academic subdivisions within an institute.
- `Program`: Degree programs (e.g., `Master of Science in Information Technology`).
- `Batch`: Academic cohorts with start and graduation years.
- `Division`: Section within a batch (e.g., `Div-A`, `Div-B`).
- `Course`: Subject curriculum offerings with semester designations.

### 3.2 Campus & Geofence Schema (`campus.prisma`)
- `Building`: Physical campus structure (CMPICA Main Building).
- `Room`: Classrooms, seminar halls, and software development labs.
- `GeofencePolygon`: GeoJSON polygon coordinate arrays representing the exact perimeter of the classroom or building.

### 3.3 Attendance & Anomaly Schema (`attendance.prisma` & `audit.prisma`)
- `AttendanceSession`: An active attendance window opened by a teacher for a specific timetable slot.
  - `status`: `OPEN`, `FINALIZED`, `CANCELLED`.
  - `openedAt`, `closedAt`, `finalizedAt`.
- `AttendanceRecord`: An individual student's recorded attendance.
  - `status`: `PRESENT`, `ABSENT`, `OVERRIDDEN`.
  - `gpsLat`, `gpsLng`, `deviceUuid`, `isOfflineSync`.
- `AnomalyAlert`: Security log generated when a scan violates anti-proxy rules (`DEVICE_MISMATCH`, `GEOFENCE_VIOLATION`, `GPS_SPOOFED`, `TOKEN_REPLAY`).
- `DeviceBinding`: 1-to-1 hardware lock tying a student's `userId` to their physical smartphone UUID.

---

## 4. NeonDB Serverless Connection Pooling

In production, the application connects to NeonDB using transaction pooling to maintain performance during simultaneous morning lecture check-ins:

```env
# Production Pooled URL (used by Elysia server container)
DATABASE_URL="postgresql://user:password@ep-xyz-pooler.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

# Direct Migration URL (used for prisma db push / migrations)
DIRECT_URL="postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require"
```

### Safe Migration & Schema Synchronization Protocol:
1. **Local Development**:
   ```bash
   bun db:push       # Pushes schema changes to local Docker PostgreSQL
   bun db:generate   # Re-generates Prisma Client with TypeScript definitions
   ```
2. **Production NeonDB**:
   Schema pushes are executed safely through the automated deployment workflow (`deploy-server.yml`):
   ```bash
   docker compose -f docker-compose.prod.yml exec -T server bun run --cwd /app/packages/db db:push
   ```
   *Destructive migrations (dropping columns or tables) must be staged and applied during scheduled maintenance windows.*
