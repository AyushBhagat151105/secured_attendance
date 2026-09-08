# Production Audit & Architectural Gap Analysis
**Target System**: Secured Attendance System (CHARUSAT)  
**Evaluated Against**: [`architecture.md`](./architecture.md) & [`AGENTS.md`](./AGENTS.md)  
**Date**: September 2026  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Critical Production & Security Blockers (P0)](#2-critical-production--security-blockers-p0)
   - [2.1 Classroom Nonce Deadlock (Single-Student Lockout)](#21-classroom-nonce-deadlock-single-student-lockout)
   - [2.2 Mobile Offline Sync Fails 100% of the Time](#22-mobile-offline-sync-fails-100-of-the-time)
   - [2.3 Complete Bypass of Device Binding](#23-complete-bypass-of-device-binding)
   - [2.4 Geofence Fails Open & Untyped Anomaly](#24-geofence-fails-open--untyped-anomaly)
   - [2.5 Server Startup & Docker Deployment Crash](#25-server-startup--docker-deployment-crash)
   - [2.6 Plaintext Credential & Bearer Token Logging](#26-plaintext-credential--bearer-token-logging)
   - [2.7 PostgreSQL Connection Exhaustion via Ephemeral QR Writes](#27-postgresql-connection-exhaustion-via-ephemeral-qr-writes)
3. [Architectural Gap Analysis vs `architecture.md`](#3-architectural-gap-analysis-vs-architecturemd)
4. [Code Standards & Quality Violations (`AGENTS.md`)](#4-code-standards--quality-violations-agentsmd)
   - [4.1 Strict Typing & ESLint Errors (217 Errors)](#41-strict-typing--eslint-errors-217-errors)
   - [4.2 300-Line File Limit Violations (17 Files)](#42-300-line-file-limit-violations-17-files)
   - [4.3 Monorepo Boundary Leaks](#43-monorepo-boundary-leaks)
   - [4.4 Zero Test Coverage](#44-zero-test-coverage)
5. [Actionable Remediation Roadmap](#5-actionable-remediation-roadmap)
6. [Key Architectural Decisions Requiring User Input](#6-key-architectural-decisions-requiring-user-input)

---

## 1. Executive Summary

A comprehensive, adversarial codebase audit was performed across all applications (`apps/server`, `apps/web`, `apps/native`) and shared packages (`packages/auth`, `packages/db`, `packages/env`).

While the project has scaffolded significant UI routes and core Prisma schemas, **the application is currently not production-ready**. Critical flaws exist in the core attendance loop, security boundaries fail open, offline synchronization permanently loses records, and the server fails to start in production Docker containers.

---

## 2. Critical Production & Security Blockers (P0)

### 2.1 Classroom Nonce Deadlock (Single-Student Lockout)
* **Locations**: [`apps/server/src/services/student.service.ts:182-208`](./apps/server/src/services/student.service.ts#L182-L208), [`packages/db/prisma/schema/attendance.prisma:83`](./packages/db/prisma/schema/attendance.prisma#L83)
* **The Mechanism**:
  ```typescript
  // Atomically mark token as used
  await prisma.qrToken.update({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date(), usedBy: profile.id },
  });
  ```
* **Failure Mode**: The teacher projects a single dynamic QR code on the lecture hall screen rotating every 45 seconds (or 10 seconds per spec). When Student 1 scans the screen at second 2, `usedAt` is set to `new Date()`. When Student 2 sitting in the same classroom scans the same screen at second 4, the server rejects it:
  ```json
  { "success": false, "error": "BAD_REQUEST", "message": "This QR code has already been used. Please scan the next one." }
  ```
* **Impact**: In a classroom of 60 students, only 1 student can scan per QR rotation. Taking attendance would require 60 rotation cycles (~10–45 minutes).
* **Remediation**:
  - A dynamic QR code displayed on a shared screen is a **time-window authenticator**, NOT a single-seat ticket.
  - Student replay prevention is already strictly enforced at the database level by the compound unique index in `attendance.prisma`:
    ```prisma
    @@unique([studentProfileId, sessionId])
    ```
  - Validate that `now <= expiresAt` and verify the HMAC signature with `sessionSecret`. Remove the single-seat lock on `usedAt`.

---

### 2.2 Mobile Offline Sync Fails 100% of the Time
* **Locations**: [`apps/native/src/lib/offline-sync.ts:33-52`](./apps/native/src/lib/offline-sync.ts#L33-L52) vs [`apps/server/src/services/student.service.ts:128-134`](./apps/server/src/services/student.service.ts#L128-L134)
* **The Mechanism**:
  1. A student with no mobile signal scans the QR code in class. `savePendingAttendance` saves `{ sessionId, nonce, signature, expiresAt: Date.now() + 45000, gpsLat, gpsLng }` to `expo-secure-store`.
  2. Minutes later, the student leaves the building and reconnects to cellular data. `syncPendingAttendance` replays `POST /api/student/attendance/scan`.
  3. The server checks:
     ```typescript
     if (Date.now() > expiresAt) {
       return { success: false, error: "BAD_REQUEST", message: "QR code has expired. Please scan the current code." };
     }
     ```
  4. The server returns HTTP 400.
  5. The native client checks if the error is a network connection issue. Because it received a valid HTTP 400 response from the server, it drops the scan:
     ```typescript
     // Drop it
     console.warn("Dropping pending scan due to non-network error:", error.message);
     ```
* **Impact**: Every offline attendance submission synced after 45 seconds is permanently lost and dropped.

---

### 2.3 Complete Bypass of Device Binding
* **Locations**: [`apps/native/src/app/_layout.tsx:57-72`](./apps/native/src/app/_layout.tsx#L57-L72), [`apps/server/src/services/student.service.ts:46`](./apps/server/src/services/student.service.ts#L46)
* **The Mechanism**:
  1. The mobile app navigation check only evaluates the boolean `profile.deviceBound`:
     ```typescript
     } else if (
       !user.requiresPasswordChange &&
       (user.role !== "student" || (profile && profile.deviceBound))
     ) {
       if (inAuthGroup) router.replace("/(tabs)");
     }
     ```
     It never compares the hardware fingerprint returned by `getDeviceFingerprint()` against `profile.deviceId`.
  2. The server receives `deviceFingerprint` in `ScanAttendanceBody` but never destructured or queried against `StudentProfile.deviceId`.
* **Impact**: Student A can bind their phone once. Student B can borrow Student A's phone, log in with Student B's credentials, bypass the binding screen completely, and submit attendance on Student A's hardware.

---

### 2.4 Geofence Fails Open & Untyped Anomaly
* **Locations**: [`apps/server/src/services/student.service.ts:227-269`](./apps/server/src/services/student.service.ts#L227-L269)
* **The Mechanism**:
  When GPS coordinates fall outside the campus radius (`!gpsWithinGeofence`), the server pushes an anomaly flag and calls `reportAnomaly`, but continues execution directly to:
  ```typescript
  const attendance = await prisma.attendance.create({ ... });
  return { success: true, attendance };
  ```
  Additionally, because `AnomalyType` has no `GEOFENCE_VIOLATION` member, it records the anomaly as `IMPOSSIBLE_TRAVEL`.
* **Impact**: Students can submit valid attendance from anywhere in the world.
* **Remediation**: Fail-closed by returning `{ success: false, error: "BAD_REQUEST", message: "Location error" }` when outside the geofence.

---

### 2.5 Server Startup & Docker Deployment Crash
* **Locations**: [`apps/server/Dockerfile:21, 40`](./apps/server/Dockerfile#L21), [`apps/server/package.json:11`](./apps/server/package.json#L11)
* **The Mechanism**:
  - `tsdown` compiles the server to `dist/index.mjs`.
  - `package.json` specifies `"start": "bun run dist/index.js"`.
  - Dockerfile specifies `CMD ["bun", "run", "dist/index.js"]`.
  - Dockerfile line 21 runs `RUN bun --filter=@secured_attendance/server build`, but the package is named `"server"`, causing the build step to fail.
* **Impact**: Running `bun start` or running the production Docker container crashes immediately:
  `error: Module not found "dist/index.js"`

---

### 2.6 Plaintext Credential & Bearer Token Logging
* **Locations**: [`packages/auth/src/index.ts:70`](./packages/auth/src/index.ts#L70), [`apps/server/src/middlewares/guards.ts:22`](./apps/server/src/middlewares/guards.ts#L22), [`apps/server/src/index.ts:30`](./apps/server/src/index.ts#L30)
* **The Mechanism**:
  ```typescript
  // In packages/auth/src/index.ts:
  onRequest: async (ctx) => {
    console.log("Auth Request Body:", ctx.body);
    console.log("Auth Request Headers:", ctx.headers);
  }
  ```
* **Impact**: Raw user passwords, authorization tokens, and session cookies are written to standard output in plaintext.

---

### 2.7 PostgreSQL Connection Exhaustion via Ephemeral QR Writes
* **Locations**: [`apps/server/src/routes/teacher.route.ts:113-145`](./apps/server/src/routes/teacher.route.ts#L113-L145)
* **The Mechanism**:
  The WebSocket server executes an interval every 45 seconds for every active session. In each cycle, it loops 5 times and executes `await prisma.qrToken.create(...)` directly into PostgreSQL.
* **Impact**: For 80 concurrent classrooms, this generates 400 database `INSERT` transactions every 45 seconds directly on PostgreSQL for ephemeral data with a 45-second lifespan.
* **Remediation**: Use Redis keys with 10s–45s TTL as specified in `architecture.md:876`.

---

## 3. Architectural Gap Analysis vs `architecture.md`

| Phase | Feature / Requirement | Specification in `architecture.md` | Actual Status in Codebase | Gap Details |
|---|---|---|---|---|
| **Phase 1** | Crypto Utilities | HKDF key derivation & HMAC verification in `lib/crypto.ts` | **Orphaned** | [`crypto.ts`](./apps/server/src/lib/crypto.ts) is implemented but never imported; routes duplicate ad-hoc crypto calls. |
| **Phase 1** | BullMQ Workers | Background email & notification workers | **Orphaned / Stubs** | Only `auditWorker` is active. Email/notification workers in [`workers.ts`](./apps/server/src/lib/workers.ts) are dummy stubs with `console.log`. |
| **Phase 2** | Biometric Enrollment | Persist biometric capability on binding | **Missing** | Native app prompts biometrics, but `biometricEnabled` is never sent to or saved by [`auth.route.ts`](./apps/server/src/routes/auth.route.ts#L55). |
| **Phase 3** | Timetable `dayOfWeek` | `0=Monday ... 5=Saturday` | **Off-by-One Mismatch** | Schema defines `0=Monday`, but `teacher.service.ts` and `timetable/index.tsx` assume JS `0=Sunday`. Schedules misalign by 1 day. |
| **Phase 4** | Session Auto-Close | Background job closes expired sessions | **Missing** | No cron or worker exists. Sessions remain `active` indefinitely unless closed manually by teacher. |
| **Phase 4** | Empty Session Handling | Graceful close of session | **Destructive** | [`teacher.service.ts:228-238`](./apps/server/src/services/teacher.service.ts#L228-L238) permanently **deletes** the session from DB if 0 students marked attendance. |
| **Phase 4** | WebSocket Admin Stream | `/ws/admin/live` campus-wide feed | **Missing** | Only teacher session sockets exist; admin live socket was never built. |
| **Phase 5** | Native App Architecture | Eden Treaty RPC client & Drawer layout | **Deviated** | Uses untyped Axios (`api-client.ts`) instead of `@elysiajs/eden`. Navigation lacks drawer layout from Section 9. |
| **Phase 5** | Student Stats & Streak | Real-time division attendance percentage | **Mocked / Hardcoded** | [`student-history.service.ts:73-91`](./apps/server/src/services/student-history.service.ts#L73-L91) hardcodes 100% percentage and streak equal to records count; never compares against total sessions held. |
| **Phase 6** | Reports & Exports | PDF & CSV generation | **Partial** | Only CSV export exists; PDF export from Section 10 was omitted. |
| **Phase 7** | Pluggable Security Modules | WiFi BSSID, BLE, Play Integrity | **Missing** | Directory `apps/server/src/plugins/` does not exist. No stubs, interfaces, or verification hooks. |
| **Phase 7** | Admin Runtime Settings | Dynamic campus & attendance configuration | **Mocked** | Web UI is a static placeholder stating "Runtime configuration coming soon". No backend API exists. |

---

## 4. Code Standards & Quality Violations (`AGENTS.md`)

### 4.1 Strict Typing & ESLint Errors (217 Errors)
* `AGENTS.md:79` specifies: *"Strict Mode: TypeScript strict mode is enabled. NEVER use `any`."*
* `bun run lint:eslint` fails with **217 errors**:
  - Handlers explicitly typed as `any` in [`teacher.route.ts:19,28,37,44`](./apps/server/src/routes/teacher.route.ts#L19), [`teacher-report.service.ts:10`](./apps/server/src/services/teacher-report.service.ts#L10), [`auth.route.ts:33`](./apps/server/src/routes/auth.route.ts#L33), and [`student.service.ts:45`](./apps/server/src/services/student.service.ts#L45).
  - Syntax error triggering `no-unexpected-multiline` in [`apps/web/src/services/admin/users.service.ts:100`](./apps/web/src/services/admin/users.service.ts#L100).

### 4.2 300-Line File Limit Violations (17 Files)
`AGENTS.md:85` specifies: *"Maximum 300 lines per file. If a file grows larger, split it into smaller, cohesive modules."*

| # | File Path | Line Count |
|---|---|---|
| 1 | [`apps/web/src/components/ui/map.tsx`](./apps/web/src/components/ui/map.tsx) | **1,343** |
| 2 | [`apps/web/src/routes/admin/campus/index.tsx`](./apps/web/src/routes/admin/campus/index.tsx) | **846** |
| 3 | [`apps/web/src/routes/admin/timetable/index.tsx`](./apps/web/src/routes/admin/timetable/index.tsx) | **790** |
| 4 | [`apps/web/src/components/ui/sidebar.tsx`](./apps/web/src/components/ui/sidebar.tsx) | **669** |
| 5 | [`apps/native/src/app/(tabs)/index.tsx`](./apps/native/src/app/%28tabs%29/index.tsx) | **455** |
| 6 | [`apps/native/src/app/(tabs)/scan.tsx`](./apps/native/src/app/%28tabs%29/scan.tsx) | **443** |
| 7 | [`apps/server/src/services/admin-timetable.service.ts`](./apps/server/src/services/admin-timetable.service.ts) | **424** |
| 8 | [`apps/server/src/services/admin-import.service.ts`](./apps/server/src/services/admin-import.service.ts) | **399** |
| 9 | [`apps/native/src/app/(tabs)/history.tsx`](./apps/native/src/app/%28tabs%29/history.tsx) | **370** |
| 10 | [`apps/web/src/components/ui/place-autocomplete.tsx`](./apps/web/src/components/ui/place-autocomplete.tsx) | **362** |
| 11 | [`apps/web/src/routes/admin/academic/subjects.tsx`](./apps/web/src/routes/admin/academic/subjects.tsx) | **353** |
| 12 | [`apps/server/src/services/admin-users.service.ts`](./apps/server/src/services/admin-users.service.ts) | **352** |
| 13 | [`apps/web/src/features/admin/users/components/user-columns.tsx`](./apps/web/src/features/admin/users/components/user-columns.tsx) | **337** |
| 14 | [`apps/native/src/app/(auth)/reset-password.tsx`](./apps/native/src/app/%28auth%29/reset-password.tsx) | **318** |
| 15 | [`apps/server/src/services/student.service.ts`](./apps/server/src/services/student.service.ts) | **316** |
| 16 | [`apps/native/src/app/(tabs)/profile.tsx`](./apps/native/src/app/%28tabs%29/profile.tsx) | **314** |
| 17 | [`apps/web/src/routes/admin/academic/programs.tsx`](./apps/web/src/routes/admin/academic/programs.tsx) | **302** |

### 4.3 Monorepo Boundary Leaks
* `AGENTS.md:40` specifies: *"Apps must NEVER import from each other directly."*
* [`apps/web/src/lib/api-client.ts:1`](./apps/web/src/lib/api-client.ts#L1) directly imports from server:
  ```typescript
  import type { App } from "server/src/index";
  ```
  Enabled via tsconfig path alias hack in [`apps/web/tsconfig.json:15`](./apps/web/tsconfig.json#L15).

### 4.4 Zero Test Coverage
* `bun test` passes with `--passWithNoTests`.
* There are **0 unit or integration tests** across the entire project. Core security logic (HMAC signing, geofencing, replay prevention) is completely unverified by automated tests.

---

## 5. Actionable Remediation Roadmap

### Phase 1: Security & Stability Hotfixes (Immediate)
1. **Fix Classroom QR Concurrency**: Remove `usedAt: null` single-seat lock in `student.service.ts`. Enforce replay prevention using `Attendance` compound uniqueness.
2. **Enforce Fail-Closed Geofence**: Return HTTP 400 `"Location error"` when `!gpsWithinGeofence`.
3. **Enforce Device Binding**: Check `profile.deviceId === body.deviceFingerprint` server-side and verify hardware ID on client startup.
4. **Remove Credential Logging**: Remove `console.log(ctx.body, ctx.headers)` in `packages/auth` and server guards.
5. **Fix Server Startup & Docker**: Update start scripts and Dockerfile `CMD` to execute `dist/index.mjs` and correct Turborepo filter name.

### Phase 2: Core Domain Logic & Data Reliability
1. **Accurate Attendance Statistics**: Count total division sessions to calculate real attendance percentages and streaks.
2. **Reconcile Timetable Days**: Unify `dayOfWeek` mapping across DB schema, CSV imports, and frontend UI.
3. **Session Auto-Close Job**: Implement a recurring BullMQ worker to auto-close sessions when `new Date() > endTime`.
4. **Preserve Empty Sessions**: Update `teacher.service.ts` to mark 0-student sessions as `closed` rather than deleting them.

### Phase 3: Architecture & Standards Alignment
1. **Type Safety & Lint Cleanliness**: Resolve the 217 ESLint errors and eliminate explicit `any` typings.
2. **Decompose Giant Files**: Break down `map.tsx` (1,343 lines), `campus/index.tsx` (846 lines), and `timetable/index.tsx` (790 lines) into modular subcomponents.
3. **Native Eden Treaty Migration**: Replace untyped Axios in `apps/native` with `@elysiajs/eden` treaty client.
4. **Vitest Suite**: Add unit tests for HMAC token validation, haversine geofence calculation, and attendance submission edge cases.

---

## 6. Key Architectural Decisions Requiring User Input

1. **Offline Mode vs. Anti-Proxy Security**:
   - Rotating QR tokens expire in 10–45 seconds. An offline submission synced later inherently carries an expired timestamp.
   - If the server accepts expired timestamps for offline submissions, students can forward QR screenshots to absent peers to submit later, destroying anti-proxy protection.
   - *Question*: Should offline scan queuing be removed, or should it require Bluetooth (BLE) attestation from the teacher device?
2. **Pluggable Security Module Rollout**:
   - `architecture.md:1063` defines pluggable modules for BLE beacons, WiFi BSSID, and Google Play Integrity.
   - *Question*: Should the abstract plugin interface in `apps/server/src/plugins/` be stubbed out now, or deferred until after the core attendance loop is stabilized?
