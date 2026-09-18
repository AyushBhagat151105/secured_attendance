# Contributing to the Secured Attendance System

Welcome to the **CHARUSAT College Development Club** engineering team! We are thrilled to have you contribute to the campus Secured Attendance System.

This repository powers real-time, anti-proxy classroom attendance across CHARUSAT departments, including CMPICA, CSPIT, and DEPSTAR. Because this system enforces institutional academic records, security, data integrity, and test coverage are non-negotiable standards for every single contribution.

---

## 🏛️ Guiding Principles

1. **Zero Production Risk**: Never write tests, seed files, or migrations that could touch or pollute live database instances.
2. **Anti-Proxy Integrity**: Every attendance entry must be backed by multi-factor cryptographic and physical verification (rotating HMAC QR nonces, hardware device binding, and GPS geofencing).
3. **Student Privacy**: Biometric hashes, device fingerprints, and location data must be securely handled and never exposed via unauthenticated endpoints.
4. **All Green CI Before Merge**: No Pull Request may be merged if type checking, unit tests, E2E tests, or production builds fail.

---

## 🚀 Quick Contribution Workflow

```text
Fork/Branch -> Code -> Verify Locally -> Commit (Conventional) -> Push -> Open PR -> CI Passes -> Review -> Merge
```

### 1. Branch Naming Conventions

Create feature branches off the latest `main` branch with descriptive prefixes:

| Branch Pattern | Usage | Example |
| :--- | :--- | :--- |
| `feat/<name>` | New features or endpoints | `feat/ble-beacon-scanner` |
| `fix/<issue>` | Bug fixes or patch repairs | `fix/qr-nonce-expiry-window` |
| `test/<scope>` | New test suites or harness enhancements | `test/offline-sync-grace-period` |
| `docs/<topic>` | Documentation updates or architecture guides | `docs/setup-guide-wsl` |
| `refactor/<target>`| Code cleanup or performance optimizations | `refactor/elysia-macro-scope` |

```bash
git checkout main
git pull origin main
git checkout -b feat/my-new-feature
```

---

### 2. Conventional Commit Standards

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This allows automated changelog generation and maintains a clean audit trail.

**Format:**
```text
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

**Allowed Types:**
- `feat`: A new user-facing or API feature.
- `fix`: A bug fix.
- `test`: Adding missing tests or correcting existing tests.
- `docs`: Documentation-only changes.
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `chore`: Build process, package updates, or repository maintenance.
- `perf`: Code changes that improve runtime performance.

**Examples:**
- `feat(server): implement bulk CSV import preview for student enrollment`
- `fix(native): prevent camera crash on backgrounding during QR scan`
- `test(e2e): add test case for duplicate scan rejection`
- `docs(setup): document Expo Go local LAN configuration`

---

## 🛡️ Database Safety & Test Isolation Rules

### Rule 1: Tests Must Never Touch a Real Database
All integration and end-to-end tests located in `apps/server/src/e2e/` run in **100% in-memory isolation**.
- The test harness (`apps/server/src/e2e/test-setup.ts`) intercepts Prisma and Redis calls.
- HTTP requests are dispatched in-process using `app.handle(new Request(...))`.
- The global test safety guard verifies that `DATABASE_URL` does not point to any remote server:
  ```typescript
  // Enforced automatically in apps/server/src/e2e/test-setup.ts
  export function verifyTestSafety(): void {
    const dbUrl = process.env.DATABASE_URL || "";
    const isLocal = !dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") || dbUrl.includes("0.0.0.0") || dbUrl.includes("test");
    if (!isLocal) {
      throw new Error("FATAL SAFETY ABORT: E2E tests attempted to run against a remote/production database!");
    }
  }
  ```

### Rule 2: Seed Scripts Have Tri-Layer Production Protection
The development seed runner (`apps/server/src/lib/seed.ts --dev`) will immediately abort if:
1. `NODE_ENV === "production"`
2. `ALLOW_DEV_SEED !== "true"`
3. `DATABASE_URL` does not point to `localhost` or `127.0.0.1`

When testing seeding locally, always use:
```bash
bun run seed:dev
# which runs: ALLOW_DEV_SEED=true bun run --filter server seed:dev
```

---

## 🧪 The Pre-PR Verification Protocol

Before submitting a Pull Request, **you must run and pass the following three verification checks locally**:

### 1. TypeScript Strict Verification
Ensures zero type errors across all 8 monorepo workspaces (`server`, `web`, `native`, `@secured_attendance/auth`, `@secured_attendance/db`, `@secured_attendance/env`, `@secured_attendance/validators`, `@secured_attendance/config`).
```bash
bun run check-types
```
*Must complete with `4 successful, 4 total` (or 8 packages clean).*

### 2. Unit & End-to-End Test Suite
Runs all domain unit tests (QR manager, attendance validator, schedule resolver) and server E2E test suites (attendance flow, route guards, admin bulk import).
```bash
bun test
```
*All 147+ tests must pass green.*

### 3. Production Build Compilation
Verifies that `server` (via `tsdown`) and `web` (via `vite`) bundle cleanly without build errors.
```bash
bun run build
```

---

## 📋 Pull Request Submission Checklist

When opening a PR on GitHub, fill in the PR template with:

- [ ] **Context & Motivation**: What problem does this PR solve? Link relevant issue numbers.
- [ ] **Implementation Summary**: Bullet points explaining what files were changed and why.
- [ ] **Local Verification Evidence**: Confirmation that `bun run check-types`, `bun test`, and `bun run build` passed.
- [ ] **Security Review**:
  - Are route guards (`requireRole`, `authMacro`) properly scoped?
  - Does the new feature expose any unauthenticated sensitive student/teacher data?
  - Do new tests use in-memory fixtures without touching live databases?

---

## 🔍 Code Review Criteria

Every PR will be reviewed by Club Leads and Student Maintainers against the following standards:

1. **Elysia Route Isolation**: Plugins must be scoped (`.as("scoped")`) so lifecycle hooks do not bleed into sibling routes.
2. **Standardized Error Envelopes**: Errors must return clean JSON structures (`{ success: false, message: string }`) with proper HTTP status codes (`400`, `401`, `403`, `404`, `500`).
3. **Atomic Transactions**: Multi-record mutations (such as attendance finalization with manual overrides) must execute within Prisma `$transaction` blocks.
4. **Clean Code & Idioms**:
   - Explicit parameter typing.
   - No commented-out dead code.
   - Descriptive function and variable names adhering to kebab-case filenames and camelCase properties.

---

## 💬 Getting Help & Communication

- **Development Club Discussions**: Join the `#secured-attendance` channel on our campus club Discord / Slack.
- **Office Hours**: Every Wednesday & Friday in CMPICA Lab 301.
- **Reporting Bugs**: Open an issue on GitHub with reproduction steps, system OS, and command logs.

Thank you for building high-quality, secure software for CHARUSAT!
