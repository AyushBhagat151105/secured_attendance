# Domain Glossary & Model — Secured Attendance

This document records the ubiquitous domain language for the institution's attendance system.

---

## Core Domain Entities & Modules

### AttendanceValidator (Deep Module)

The pure domain engine responsible for evaluating whether an attendance scan satisfies institutional anti-proxy and security invariants. It performs zero direct database or network I/O, taking a `ScanContext` and returning a deterministic `VerificationVerdict`.

### ScanContext (Interface)

The complete snapshot of data required to evaluate attendance validity:

- **Student Identity**: `studentId`, `divisionId`, `enrolledDivisions`
- **Device Identity**: `detectedFingerprint`, `boundFingerprint`, `deviceBound`
- **Session State**: `sessionId`, `status`, `createdAt`, `sessionSecret`, `roomBuilding`
- **Spatial Data**: `studentGps` (`lat`, `lng`, `accuracy`), `mockFlag`
- **Token Proof**: `nonce`, `signature`, `expiresAt`, `scannedAt`, `isOfflineSync`

### VerificationVerdict (Interface)

The structured outcome produced by `AttendanceValidator`:

- `outcome`: `"ACCEPTED"` | `"REJECTED"`
- `rejectionReason`?: `"MOCK_LOCATION"` | `"DEVICE_MISMATCH"` | `"SESSION_INACTIVE"` | `"NOT_ENROLLED"` | `"TOKEN_EXPIRED"` | `"INVALID_SIGNATURE"` | `"ALREADY_MARKED"` | `"OUTSIDE_GEOFENCE"`
- `anomalies`: List of detected security violations (e.g. `GEOFENCE_VIOLATION`, `IMPOSSIBLE_TRAVEL`)
- `effectiveGpsDistance`?: Computed distance in meters from classroom center

### GeofencePolicy (Domain Rule)

Calculates physical distance from the room's building center using the spherical Haversine formula. Applies dynamic horizontal accuracy tolerance based on device GPS accuracy (`tolerance = clamp(accuracy, 15m, 45m)`) to handle indoor attenuation while preventing off-campus spoofing.

### SessionWindowPolicy (Domain Rule)

Enforces token freshness:

- **Live Scans**: Strictly rejected if `Date.now() > expiresAt` (45-second rotation window). Session must be `active`.
- **Offline Sync**: Permitted for sessions created within the last 24 hours (`MAX_OFFLINE_SYNC_WINDOW_MS`), even if currently closed.

### DeviceIntegrityPolicy (Domain Rule)

Enforces 1-device-per-student cryptographic lock. If a student profile has `deviceBound: true`, the scan's `deviceFingerprint` must match `boundDeviceId` exactly.

### QrTokenManager (Deep Module)

The single authority on the QR token security lifecycle:
- Computes and verifies constant-time HMAC-SHA256 signatures for rotating attendance tokens (`sessionId:nonce:expiresAt`).
- Issues sequential token batches with staggered active and expiration windows for classroom projector displays.
- Abstracts cache and database nonce lookups behind a `QrStorageAdapter` seam.

### QrStorageAdapter (Seam)

An interface separating token storage semantics from domain logic:
- `RedisPrismaQrStorageAdapter`: Production adapter combining Redis fast-path TTL caching with PostgreSQL batch persistence.
- `InMemoryQrStorageAdapter`: Test adapter enabling full batch generation and lookup testing with zero external infrastructure.

### SessionGate (Deep Module — Client)

The single authority on client session reconciliation, offline cache synchronization, and navigation gate status computation in the native application.
- Decouples UI layout rendering (`_layout.tsx`) from multi-source authentication resolution.
- Resolves state into a typed `SessionGateStatus`: `LOADING`, `UNAUTHENTICATED`, `PASSWORD_CHANGE_REQUIRED`, `DEVICE_BINDING_REQUIRED`, `DEVICE_MISMATCH`, `AUTHORIZED`.
- Pure decision engine `resolveSessionGateStatus` enables 100% in-memory unit testing of mobile route guards without mounting React Native trees.

### ScheduleResolver (Deep Module)

The single authority on academic scheduling, timetable resolution, and session alignment:
- Encapsulates Indian Standard Time (`Asia/Kolkata`) day-of-week and start-of-day boundary conversions.
- Resolves timetable slots to concrete attendance sessions using strict ID matching and anti-hijacking time-proximity heuristics ($\le 45\text{ mins}$).
- Manages the lifecycle auto-close policy for expired active attendance sessions.



