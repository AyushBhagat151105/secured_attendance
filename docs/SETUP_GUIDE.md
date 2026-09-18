# Campus Development Club: Local Setup & Onboarding Guide

This comprehensive guide will help you set up and run the entire **Secured Attendance System** on your local machine.

Whether you are developing the **ElysiaJS Backend API**, the **React Admin/Teacher Web Dashboard**, or the **React Native (Expo) Student Mobile App**, follow this guide to get running in minutes.

---

## 💻 System Prerequisites

Before starting, ensure you have installed the required toolchain for your operating system:

| Tool | Recommended Version | Purpose |
| :--- | :--- | :--- |
| **Bun** | `v1.2.0` or higher | Primary runtime, package manager & test runner |
| **Docker & Docker Compose** | Latest | Local PostgreSQL 16 & Redis 7 containers |
| **Node.js** | `v22.x` | Toolchain and Expo compatibility |
| **Git** | Latest | Source control |
| **Expo Go** (Optional for mobile) | Latest (from Play Store / App Store) | Physical device testing for student QR scanning |

### Installation Commands by OS:

#### Linux (Ubuntu / Debian / Fedora)
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Docker & Docker Compose
# Ubuntu/Debian:
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER && newgrp docker

# Fedora:
sudo dnf install -y docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER && newgrp docker
```

#### macOS (Homebrew)
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Docker Desktop (or Colima)
brew install --cask docker

# Install Node 22 (via fnm, nvm, or brew)
brew install node@22
```

#### Windows (WSL2 Required)
> **Important**: Windows developers **must** use [WSL2 (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install) with Ubuntu. Running directly on PowerShell or Command Prompt is not supported due to native Unix symlinks and Bun tooling.
```bash
# Inside WSL2 Ubuntu terminal:
curl -fsSL https://bun.sh/install | bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
```

---

## 📦 Step 1: Clone Repository & Install Dependencies

```bash
git clone https://github.com/ayushbhagat151105/secured_attendance.git
cd secured_attendance

# Install monorepo dependencies across all packages
bun install
```

---

## 🐳 Step 2: Spin Up Local Database & Redis Services

The project uses Docker Compose to provide an isolated PostgreSQL 16 database and Redis 7 cache.

```bash
# Start PostgreSQL (port 5432) and Redis (port 6379) in background
docker compose -f packages/db/docker-compose.yml up -d

# Verify both containers are healthy
docker compose -f packages/db/docker-compose.yml ps
```

---

## 🗄️ Step 3: Synchronize Prisma Schema & Generate Client

Sync the Prisma multi-schema database models with your local PostgreSQL container:

```bash
# Push Prisma schema to local database
bun db:push

# Generate typed Prisma client
bun db:generate
```

---

## 🌱 Step 4: Safely Seed Local Campus Data

We maintain a **single unified seed controller** (`apps/server/src/lib/seed.ts`) supporting two modes:

| Script Command | Target | Purpose & Behavior |
| :--- | :--- | :--- |
| `bun run seed:dev` | `apps/server/src/lib/seed.ts --dev` | **Development University Seed**: Populates complete CHARUSAT campus data (CMPICA Building, Lab 301, MSIT Div-A/B, timetable slot, 5 sample students, teacher, dev admin). Protected by tri-layer production abort guards. |
| `bun run db:seed` | `apps/server/src/lib/seed.ts` | **Production Bootstrap Seed**: Only creates the initial institutional Super Admin user from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` env vars. Creates **zero** dummy students, fake buildings, or test classes. |

For local development and testing, run the development seed:

```bash
# Run safe local seed (with built-in tri-layer production protection)
bun run seed:dev
```

The development seed populates:
- **Campus Building**: CMPICA Building (`lat: 22.5995, lng: 72.8205`, radius: 60 meters)
- **Room**: Lab 301
- **Program & Division**: Master of Science in Information Technology (MSIT), Semester 1, Div-A and Div-B
- **Subject**: MSIT101 - Advanced Web Architecture
- **Timetable Entry**: Assigned Tuesday/Thursday slot linking teacher, room, and division
- **Super Admin, Teacher, and 5 Sample Students**

### 🔑 Local Development Credentials

| Role | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Admin CHARUSAT | `admin@charusat.edu.in` | `Admin@1234` | Full system privileges, user import, device unbind |
| **Teacher** | Prof. Hitesh Patel | `hmp@charusat.ac.in` | `Teacher@1234` | CMPICA Department, can launch attendance sessions |
| **Student 1** | Ayush Bhagat | `26msit001@charusat.edu.in` | `Student@1234` | Div-A, Roll No 1, unbound (prompts hardware binding on first mobile login) |
| **Student 2** | Siddharth Patel | `26msit002@charusat.edu.in` | `Student@1234` | Div-A, Roll No 2, unbound device (ready for test bind) |
| **Student 3** | Pooja Dave | `26msit003@charusat.edu.in` | `Student@1234` | Div-B, Roll No 3 (for testing division mismatches) |
| **Student 4** | Meet Shah | `26msit004@charusat.edu.in` | `Student@1234` | Div-A, Roll No 4, marked `suspended` (for guard tests) |
| **Student 5** | Riya Sharma | `26msit005@charusat.edu.in` | `Student@1234` | Div-A, Roll No 5 |

---

## 🏃 Step 5: Start Development Servers

We recommend opening separate terminal tabs to watch server logs, web UI updates, and mobile bundles independently:

### Terminal 1: Backend API (ElysiaJS)
```bash
bun dev:server
```
- API Server runs at: `http://localhost:3000`
- Interactive API Documentation (Scalar / OpenAPI): `http://localhost:3000/scalar`
- Health check: `http://localhost:3000/health`

### Terminal 2: Web Dashboard (TanStack Router + React)
```bash
bun dev:web
```
- Web App runs at: `http://localhost:5173`
- Log in as Teacher (`hmp@charusat.ac.in`) or Admin (`admin@charusat.edu.in`).

### Terminal 3: Mobile App (React Native Expo)
```bash
bun dev:native
```
- Starts Expo Metro bundler on port `8081`.

---

## 📱 Step 6: Testing Mobile App on Physical Phone (Expo Go)

To test the student QR scanning experience on your real phone:

1. **Ensure Phone & Computer are on the Same Wi-Fi Network** (e.g., your home Wi-Fi or mobile hotspot).
2. **Find Your Computer's Local IP Address**:
   - **Linux**: `ip route get 1.1.1.1 | awk '{print $7}'` (e.g., `192.168.1.45`)
   - **macOS**: `ipconfig getifaddr en0` (e.g., `192.168.1.45`)
   - **Windows WSL2**: Run `ipconfig` in PowerShell and look for your Wi-Fi IPv4 address.
3. **Configure the Mobile App Environment**:
   Create or edit `apps/native/.env`:
   ```env
   EXPO_PUBLIC_SERVER_URL=http://192.168.1.45:3000
   ```
   *(Replace `192.168.1.45` with your machine's actual LAN IP).*
4. **Launch Expo with LAN mode**:
   ```bash
   cd apps/native
   bun run dev -- --lan
   ```
5. **Open Expo Go**:
   - Scan the QR code displayed in the terminal with your phone camera (iOS) or Expo Go app (Android).
6. **Log in as Student**:
   - Email: `26msit002@charusat.edu.in`
   - Password: `Student@1234`
   - On first login, the app will automatically register your phone's hardware UUID to your student profile.

---

## 🛰️ Step 7: Testing Campus GPS Geofencing

The campus attendance validator checks that scans occur within **60 meters** of CMPICA Building (`22.5995, 72.8205`).

### If You are Physically on CHARUSAT Campus:
When you scan the teacher's projector screen inside CMPICA Lab 301, your genuine GPS will be accepted automatically.

### If You are Developing Remotely / Off-Campus:
To test scan verification without being physically in Changa:
- **Android**: Enable "Developer Options" -> "Select mock location app" -> Use a GPS spoofing app set to `22.5995, 72.8205`. Note: The server checks `mockFlag: true` and will flag this as a simulated anomaly in audit logs, allowing you to test anti-spoofing alert rules!
- **iOS Simulator**: Debug -> Location -> Custom Location -> Latitude: `22.5995`, Longitude: `72.8205`.
- **In-Memory E2E Tests**: Run `bun test` to execute pre-configured test scenarios simulating exact coordinates, mock flags, and out-of-bounds locations.

---

## 🧪 Step 8: Running Verification Checks

Always confirm that all checks pass before pushing code:

```bash
# 1. Check TypeScript types across all 8 workspaces
bun run check-types

# 2. Run all 147+ unit and isolated E2E tests
bun test

# 3. Verify production compilation
bun run build
```

---

## ❓ Troubleshooting FAQ

### 1. "Port 3000 or 5432 already in use"
Check which process is holding the port:
```bash
sudo lsof -i :3000
sudo lsof -i :5432
```
If a system PostgreSQL is running on port 5432, stop it (`sudo systemctl stop postgresql`) or update the port mapping in `packages/db/docker-compose.yml`.

### 2. "Network request failed on mobile app"
- Verify that your phone and development machine are connected to the exact same Wi-Fi subnet.
- Check your local firewall. On Linux:
  ```bash
  sudo ufw allow 3000/tcp
  sudo ufw allow 8081/tcp
  ```
- Make sure `EXPO_PUBLIC_SERVER_URL` has `http://`, your IP, and port `:3000` (e.g., `http://192.168.1.45:3000`).

### 3. "CORS error on Web Dashboard"
The backend allows `http://localhost:5173` by default. If your web app runs on another port, add it to `CORS_ORIGIN` in `apps/server/.env`.

---

Happy Hacking! For questions, check `CONTRIBUTING.md` or contact the club leads on Discord.
