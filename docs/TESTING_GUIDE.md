# Zero-DB Test Harness & Integration Testing Guide

> **Test Runner**: Bun Test (`bun test`)  
> **Test Scope**: 86 passing tests covering domain algorithms, route guards, E2E attendance flows, CSV imports, and update delivery  
> **Execution Time**: ~450ms–500ms across all workspaces  

---

## 1. Zero-DB Testing Philosophy

Connecting to a live or staging database during automated test execution introduces three major failure points:
1. **Accidental Production Contamination**: A misconfigured `.env` can drop or truncate live campus academic records.
2. **Slow Execution & Flakiness**: Network latency, database connection handshakes, and leftover state from prior runs cause flaky tests.
3. **External Dependencies in CI**: Requiring live database containers slows down GitHub Actions runners.

To eliminate these issues, the Secured Attendance test suite runs in **100% in-memory isolation**:

```text
               [ bun test ]
                     │
                     ▼
     [ test-setup.ts (Safety Check) ]
    Verifies DATABASE_URL is not remote
                     │
                     ▼
     ┌───────────────────────────────┐
     │   In-Memory Mock Database     │ <── Intercepts prisma.* queries
     ├───────────────────────────────┤
     │   In-Memory Mock Redis Cache  │ <── Intercepts redis.* commands
     ├───────────────────────────────┤
     │   Mock Audit Queue Worker     │ <── Intercepts BullMQ jobs
     └───────────────┬───────────────┘
                     │
                     ▼
     [ In-Process HTTP Dispatcher ]
    app.handle(new Request("http://localhost/..."))
                     │
                     ▼
        [ Result Assertion in <1ms ]
```

---

## 2. Global Test Safety Guard

The test harness enforces a mandatory safety guard in `apps/server/src/e2e/test-setup.ts`:

```typescript
export function verifyTestSafety(): void {
  const dbUrl = process.env.DATABASE_URL || "";
  const isLocal =
    !dbUrl ||
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("0.0.0.0") ||
    dbUrl.includes("test");

  if (!isLocal) {
    throw new Error(
      "FATAL SAFETY ABORT: Tests attempted to run against a remote/production database! Check your DATABASE_URL.",
    );
  }
}
```
If a developer or CI environment inadvertently sets `DATABASE_URL` to a remote host (e.g., NeonDB or AWS RDS), the test runner immediately throws a fatal exception before executing any test case.

---

## 3. Test Suites Structure & Coverage

The repository contains two layers of tests:

### 3.1 Pure Domain Unit Tests (`apps/server/src/domain/`)
Tests pure mathematical and cryptographic algorithms without HTTP or network overhead:
- **`qr-token.test.ts`**: Verifies HMAC-SHA256 signature generation, 10s rotation intervals, and rejection of expired nonces (>45s).
- **`attendance-validator.test.ts`**: Verifies Haversine distance calculations, polygon containment, concrete attenuation buffers, and single-device hardware matching.
- **`schedule-resolver.test.ts`**: Tests timetable lookups, slot resolutions, and division boundary checks.

### 3.2 In-Memory E2E Integration Tests (`apps/server/src/e2e/`)
Tests full API route lifecycles by dispatching HTTP requests into the Elysia application instance:
- **`full-attendance-flow.e2e.test.ts`**: Tests session launch -> live QR generation -> student scan -> teacher manual override finalization.
- **`route-guards-and-roles.e2e.test.ts`**: Tests authentication macros, ensuring students cannot access admin routes (403) and unauthenticated users receive 401.
- **`admin-and-import.e2e.test.ts`**: Tests user CRUD, CSV roster imports with column auto-mapping, device unbinding, and account suspensions.
- **`updates.test.ts`**: Tests OTA manifest generation (`/updates`), Hermes bytecode delivery, and APK binary downloads (`/download/:file`).

---

## 4. Running Tests Locally

```bash
# Run all unit and E2E tests
bun test

# Run a specific test suite
bun test apps/server/src/e2e/full-attendance-flow.e2e.test.ts

# Run tests in watch mode during development
bun test --watch
```

---

## 5. Pattern for Writing New Integration Tests

When creating a new route or feature, follow this test pattern:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../index";
import { resetMockDb, seedMockData } from "./test-setup";

describe("New Feature API (/api/my-feature)", () => {
  beforeAll(async () => {
    // 1. Reset in-memory database to a clean slate
    resetMockDb();
    // 2. Seed test fixtures (e.g. mock teacher or student)
    await seedMockData();
  });

  it("should reject unauthenticated requests with 401", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/my-feature", {
        method: "GET",
      })
    );

    expect(response.status).toBe(401);
  });

  it("should process authenticated student request successfully", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/my-feature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer test-student-session-token",
        },
        body: JSON.stringify({ key: "value" }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
```

---

## 6. Managing Ephemeral Mock Fixtures

For tests that serve physical files from disk (e.g. `updates.test.ts`):
1. **Do not commit test binaries or bundles to git**.
2. Create temporary mock files in `beforeAll`:
   ```typescript
   beforeAll(() => {
     fs.mkdirSync("uploads/downloads", { recursive: true });
     fs.writeFileSync("uploads/downloads/test-app.apk", "mock binary content");
   });
   ```
3. Clean them up in `afterAll`:
   ```typescript
   afterAll(() => {
     fs.rmSync("uploads/downloads/test-app.apk", { force: true });
   });
   ```
This ensures CI runners stay hermetic and builds remain 100% reproducible.
