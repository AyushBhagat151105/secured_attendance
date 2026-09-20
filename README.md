<p align="center">
  <img src="assets/charusat-logo.png" alt="CHARUSAT University Logo" height="65" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/cmpica-logo.webp" alt="CMPICA Department Logo" height="65" />
</p>

<h1 align="center">CHARUSAT Secured Attendance System</h1>

<p align="center">
  <strong>Smt. Chandaben Mohanbhai Patel Institute of Computer Applications (CMPICA)</strong><br />
  <em>Charotar University of Science & Technology, Changa, Gujarat 388421, India</em>
</p>

<p align="center">
  <a href="https://github.com/ayushbhagat151105/secured_attendance/actions/workflows/pr.yml"><img src="https://github.com/ayushbhagat151105/secured_attendance/actions/workflows/pr.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://github.com/ayushbhagat151105/secured_attendance"><img src="https://img.shields.io/badge/tests-86%20passing-brightgreen.svg" alt="Tests" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-strict-blue.svg" alt="TypeScript Strict" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-bun%20v1.2+-black.svg" alt="Bun Runtime" /></a>
  <a href="https://charusat.ac.in"><img src="https://img.shields.io/badge/department-CMPICA%20CHARUSAT-red.svg" alt="CMPICA CHARUSAT" /></a>
</p>

---

> **Official Campus Production Platform**  
> Engineered by **Ayush Bhagat** for **Charotar University of Science & Technology (CHARUSAT)** and the **CMPICA Department**.  
> An enterprise anti-proxy attendance tracking ecosystem combining rotating cryptographic QR nonces, GPS geofencing with indoor accuracy buffers, and single-device hardware binding.

---

## 👨‍💻 Creator & Lead Developer

| Lead Developer & Architect | Institutional Affiliation | Engineering Scope | Social & Portfolio Links |
| :--- | :--- | :--- | :--- |
| **Ayush Bhagat** | **CMPICA, CHARUSAT** (Changa, Gujarat) | **Sole System Architect & Lead Full-Stack Developer** | [GitHub](https://github.com/ayushbhagat151105) • [LinkedIn](https://www.linkedin.com/in/ayush-bhagat-99b7b82b3/) • [Instagram](https://www.instagram.com/bhagat_ayush__/) |

### Core Subsystems Authored & Engineered:
- **Anti-Proxy Security Pipeline**: Conceived and built the rotating HMAC-SHA256 QR token generator with a 45-second sliding validity window, single-device cryptographic hardware binding (`device-binding.tsx`), and polygon Haversine geofencing with dynamic concrete attenuation tolerance.
- **Zero-DB E2E Test Suite**: Architected an in-memory database and Redis simulation harness running in ~500ms with zero live-database risk, maintaining 86 passing tests across all full attendance lifecycles, route guards, update delivery, and admin bulk CSV imports.
- **Full-Stack Monorepo Platform**: Engineered the Bun/ElysiaJS high-throughput backend API, TanStack Router web dashboard with interactive Leaflet campus geofence visualizers, and React Native Expo student mobile app with offline scan queuing.

---

## 🧭 Developer Onboarding & Documentation

| Document | Description |
| :--- | :--- |
| 📖 **[Local Setup Guide](docs/SETUP_GUIDE.md)** | Step-by-step setup for Linux, macOS, and Windows WSL2, Docker containers, Expo Go, and GPS simulator |
| 🤝 **[Contributing Guide](CONTRIBUTING.md)** | Branching rules, conventional commits, pre-PR test checklists, and code review criteria |
| 🏗️ **[System Architecture](docs/ARCHITECTURE.md)** | High-level system architecture, monorepo topology, and core workflows |
| 🚀 **[VPS Deployment Guide](docs/DEPLOYMENT.md)** | Hostinger VPS operations, Docker production compose, Caddy reverse proxy, and CI/CD pipelines |
| 📱 **[Mobile Release Guide](docs/MOBILE_RELEASE_GUIDE.md)** | Self-hosted APK distribution, GitHub Actions cloud builds, OTA updates, and permissions |
| 📡 **[API Reference](docs/API_REFERENCE.md)** | Elysia route endpoints, role authorization models, error envelopes, and Scalar documentation |
| 🛡️ **[Security & Anti-Proxy Audit](docs/SECURITY_AUDIT.md)** | Rotating HMAC-SHA256 tokens, single-device binding, polygon geofencing, and anti-cloning |
| 🗄️ **[Database Architecture](docs/DATABASE_SCHEMA.md)** | Prisma 8-schema layout, entity relationship models, and NeonDB serverless pooling |
| 🧪 **[Testing Guide](docs/TESTING_GUIDE.md)** | Zero-DB in-memory test harness, test safety guards, and E2E patterns |

---

## ⚡ Quick Start (Local Development)

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/ayushbhagat151105/secured_attendance.git
cd secured_attendance
bun install

# 2. Start PostgreSQL 16 & Redis 7 via Docker
docker compose -f packages/db/docker-compose.yml up -d

# 3. Synchronize database schema & generate Prisma client
bun db:push
bun db:generate

# 4. Safely seed local development data (with tri-layer production protection)
bun run seed:dev

# 5. Start development servers in separate terminals:
bun dev:server   # Backend API on http://localhost:3000 (Docs at /scalar)
bun dev:web      # Web Dashboard on http://localhost:5173
bun dev:native   # Expo Metro Bundler for student mobile app
```

---

## 🔑 Pre-Seeded Development Credentials

Run `bun run seed:dev` to populate your local database with real CHARUSAT structures (CMPICA Building, Lab 301, MSIT program):

| Role | Name | Email | Password | Role Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Admin CHARUSAT | `admin@charusat.edu.in` | `Admin@1234` | Full system control, CSV user bulk import, device unbinding |
| **Teacher** | Prof. Hitesh Patel | `hmp@charusat.ac.in` | `Teacher@1234` | CMPICA Department, can launch sessions and finalize rosters |
| **Student 1** | Ayush Bhagat | `26msit001@charusat.edu.in` | `Student@1234` | Div-A (Roll 1), unbound (prompts hardware binding on first mobile login) |
| **Student 2** | Siddharth Patel | `26msit002@charusat.edu.in` | `Student@1234` | Div-A (Roll 2), unbound device (ready for fresh mobile bind) |
| **Student 3** | Pooja Dave | `26msit003@charusat.edu.in` | `Student@1234` | Div-B (Roll 3), used for testing division boundary checks |
| **Student 4** | Meet Shah | `26msit004@charusat.edu.in` | `Student@1234` | Div-A (Roll 4), suspended status (used for guard tests) |

---

## 🛡️ Anti-Proxy Defense Pipeline

Attendance fraud is prevented using a layered physical and cryptographic validation pipeline:

```text
[Student Camera] ──> [Dynamic QR Nonce] ──> [HMAC-SHA256 Signature Verification]
                                                          │
[Inside Geofence?] ◄── [Device UUID Bound?] ◄───────────────┘
        │
        ├── No  ──► 400/403 Rejected + Anomaly Logged
        └── Yes ──► 200 OK: Attendance Recorded
```

1. **Rotating HMAC-SHA256 Tokens**: Nonces rotate every 10 seconds via WebSockets with a 45-second sliding validity window. Tokens are single-use and invalidated in Redis upon scan.
2. **1-Device-per-Student Hardware Binding**: Student phones are cryptographically bound to their account on first login. Proxy scanning from a peer's phone triggers an immediate `403 Forbidden` and raises an `AnomalyAlert`.
3. **Campus GPS Geofencing**: Validates student coordinates against the classroom building polygon using the Haversine formula with indoor accuracy compensation. Native mock location providers (`mockFlag`) are flagged and rejected.
4. **Offline Sync Grace Window**: In classrooms without cellular service, scans are securely queued locally and verified against token timestamps within a 24-hour grace window upon reconnection.
5. **Teacher Override Finalization**: Teachers review the live attendance roster and can manually override attendance records in an atomic database transaction.

---

## 🧪 Pre-PR Quality Protocol

Before opening a Pull Request, run the 3 verification steps locally:

```bash
# 1. Type check all 8 workspaces
bun run check-types

# 2. Run unit and isolated E2E tests (86 tests, ~500ms execution)
bun test

# 3. Verify production compilation
bun run build
```

The automated GitHub Actions CI pipeline (`.github/workflows/pr.yml`) runs on all PRs to guarantee that no broken code or untested features reach `main`.

---

## 🚀 Cloud CI/CD & Deployment Workflows

| Workflow | Trigger | Description | Output Target |
| :--- | :--- | :--- | :--- |
| **`pr.yml`** | PR / Push to `main` | Full typecheck, 86 isolated test suite, and monorepo build verification | GitHub Actions Check |
| **`deploy-server.yml`** | Push to `apps/server/**` | Builds Docker image with multi-stage build, pushes to GHCR, restarts VPS container | Hostinger VPS Docker |
| **`deploy-web.yml`** | Push to `apps/web/**` | Builds static TanStack web app, deploys via SCP to Caddy web root | `/var/www/secured-attendance-web` |
| **`deploy-ota.yml`** | Push to `apps/native/src/**` | Exports Hermes JS bundle & updates manifest in ~60s | `/root/.../uploads/updates` |
| **`deploy-apk.yml`** | Tag `v*` or Manual Dispatch | Builds R8-minified `arm64-v8a` release APK in GitHub cloud runner, uploads to VPS & GitHub Releases | `/root/.../uploads/downloads/secured-attendance.apk` |

---

## 🏛️ Monorepo Architecture

- **`apps/server`**: High-performance backend built on [ElysiaJS](https://elysiajs.com) and Bun with scoped route plugins, BullMQ queues, and Winston auditing.
- **`apps/web`**: Teacher & Administrator dashboard built with [TanStack Router](https://tanstack.com/router), React 19, Leaflet maps, and Tailwind CSS.
- **`apps/native`**: Student mobile application built with [React Native (Expo)](https://expo.dev), NativeWind, and Vision Camera for fast QR scanning.
- **`packages/auth`**: Authentication layer configured with [Better-Auth](https://better-auth.com).
- **`packages/db`**: Multi-schema PostgreSQL database layout managed with [Prisma](https://www.prisma.io).
- **`packages/env`**: Synchronous type-safe environment variable parsing.

---

## 🏛️ Institutional Accreditation & Copyright

**Charotar University of Science and Technology (CHARUSAT)**  
**Smt. Chandaben Mohanbhai Patel Institute of Computer Applications (CMPICA)**  
*Charusat Campus, Highway, Off, Nadiad - Petlad Rd, Changa, Gujarat 388421*  
© 2026 CHARUSAT • CMPICA Department. All Rights Reserved.  
Lead Developer: **Ayush Bhagat**
