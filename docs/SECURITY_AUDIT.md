# Anti-Proxy Security Model & Cryptographic Audit Specification

> **System**: CHARUSAT Secured Attendance Platform  
> **Accreditation Scope**: Campus Anti-Proxy Verification, Academic Integrity & Zero-Trust Architecture  
> **Lead Architect**: Ayush Bhagat (CMPICA, CHARUSAT)  

---

## 1. Threat Model & Institutional Attack Vectors

In a university campus environment, attendance fraud typically manifests through four primary vectors:

| Attack Vector | Real-World Scenario | System Defense Mechanism |
| :--- | :--- | :--- |
| **Token Relaying (Proxy WhatsApp)** | An attending student photographs the projected QR code and sends it to an absent roommate. | **Rotating HMAC-SHA256 Nonces**: 10-second WebSocket rotation with a 45-second sliding expiration window and single-use Redis consumption. |
| **Buddy Scanning (Device Sharing)** | A student brings an absent friend's login credentials to scan multiple times on a single phone. | **1-Device Cryptographic Hardware Binding**: Student accounts are permanently locked to their phone's unique hardware identifier. |
| **GPS Coordinate Spoofing** | A student uses developer options mock locations or fake GPS applications from their hostel. | **Polygon Geofencing & Mock Provider Inspection**: Haversine distance verification against building polygon boundaries with native `isMock` provider detection. |
| **Virtual App Cloning** | A student runs cloned instances of the app (e.g., Parallel Space, Dual Apps) to bypass device locks. | **Anti-Clone Virtual Container Detection**: Analyzes private file sandboxes, package paths, and process memory maps to detect virtualization. |

---

## 2. Multi-Layer Anti-Proxy Defense Pipeline

```text
               [ Projected Classroom Screen / Teacher Dashboard ]
                                       │
                         Generates Dynamic QR Nonce
                         (HMAC-SHA256 Keyed by Secret)
                                       │
                                       ▼
                   [ Student Phone Scans Dynamic QR ]
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │  Client-Side Hardware & Integrity Checks  │
                 ├───────────────────────────────────────────┤
                 │ • Validates native camera input           │
                 │ • Inspects GPS mock location provider     │
                 │ • Checks private file sandbox for clones  │
                 │ • Attaches bound device hardware UUID     │
                 └─────────────────────┬─────────────────────┘
                                       │
                                       ▼
                        [ Elysia Server Domain Gate ]
                                       │
         1. Token Verification: Valid HMAC signature?
            ├── No  ──► [ 400 Bad Request: Invalid Token ]
            └── Yes ──► Continue
                                       │
         2. Expiration Window: Issued within last 45 seconds?
            ├── No  ──► [ 400 Bad Request: Nonce Expired ]
            └── Yes ──► Continue
                                       │
         3. Replay Prevention: Exists in Redis Blacklist?
            ├── Yes ──► [ 400 Bad Request: Token Already Consumed ]
            └── No  ──► Add token to Redis with TTL = 45s
                                       │
         4. Device Binding: Does device UUID match student profile?
            ├── No  ──► [ 403 Forbidden: Foreign Device ] ──► Log AnomalyAlert
            └── Yes ──► Continue
                                       │
         5. GPS Geofencing: Is student inside classroom polygon?
            ├── No  ──► [ 400 Bad Request: Outside Geofence ] ──► Log AnomalyAlert
            └── Yes ──► Continue
                                       │
         6. Mock Provider Flag: Was location mocked?
            ├── Yes ──► [ 400 Bad Request: Spoofing Detected ] ──► Log AnomalyAlert
            └── No  ──► Record Attendance (200 OK)
```

---

## 3. Cryptographic Token Generation Specification

Dynamic QR codes are generated server-side using **HMAC-SHA256**:

```typescript
// Token Structure:
// payload = `${sessionId}:${timetableId}:${timestamp}:${salt}`
// signature = HMAC_SHA256(payload, SERVER_SECRET)
// token = `${payload}.${signature}`
```

- **Rotation Interval**: Re-generated and broadcasted every **10 seconds** via WebSockets.
- **Sliding Validity Window**: The server permits nonces created up to **45 seconds** prior to submission. This accommodates camera autofocus delays, network jitter, and student queuing while preventing remote relaying.
- **Single-Use Atomic Blacklisting**: Once verified, the token hash is set in Redis (`SET token:<hash> 1 EX 45 NX`). If the key already exists, subsequent attempts are rejected as replays.

---

## 4. Haversine Polygon Geofencing & Indoor Buffers

Classrooms and computer labs at CHARUSAT are defined as convex geographical polygons.

### Distance Calculation:
The Haversine formula determines the great-circle distance between the student's GPS coordinate $(\phi_1, \lambda_1)$ and the nearest polygon boundary point $(\phi_2, \lambda_2)$:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c \quad (\text{where } R = 6,371,000 \text{ meters})$$

### Concrete Attenuation Tolerance:
Because indoor classroom walls and multi-story concrete structures degrade GPS signal accuracy, the validation engine dynamically applies an **accuracy buffer**:
```typescript
effectiveRadius = polygonRadius + Math.min(gpsAccuracyMeters, 25.0);
```
If calculated distance $d > effectiveRadius$, the scan is rejected and logged as `GEOFENCE_VIOLATION`.

---

## 5. Anti-Clone Virtual Container Detection

Virtual app cloning apps (e.g., Parallel Space, Dual Space) allow users to run multiple isolated instances of the same APK to scan for peers.

The student native client detects these environments prior to scanning:
1. **Internal File Path Inspection**:
   Legitimate Android apps install into `/data/user/0/<package_name>/`.
   Cloned containers run inside altered directories like `/data/data/<host_package>/virtual/data/user/0/...`.
2. **Process Sandboxing Checks**:
   Queries OS process metadata to verify that `context.getPackageName()` matches the running package without wrapper redirection.
3. **Hardware Fingerprint Uniqueness**:
   Extracts low-level hardware characteristics (`Build.FINGERPRINT`, `Build.HARDWARE`, `Build.SERIAL`) rather than user-resettable software IDs.

---

## 6. Institutional Audit Trails & Anomaly Alerts

Any anomalous scan creates an `AnomalyAlert` record in the database for faculty review:

```typescript
enum AnomalyType {
  DEVICE_MISMATCH      // Student scanned using an unbound or foreign phone
  GEOFENCE_VIOLATION   // Student attempted scanning from outside classroom
  GPS_SPOOFED          // Mock location provider detected
  SUSPICIOUS_VELOCITY  // Student marked attendance in two distant buildings within minutes
  TOKEN_REPLAY         // Duplicate scan attempt of the same token
}
```

Teachers review flagged anomalies in the web dashboard during session finalization and can confirm or override attendance records before institutional submission.
