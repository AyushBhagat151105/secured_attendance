# Secured Attendance System

A robust, enterprise-grade attendance tracking system built for CHARUSAT. It features a dual-platform architecture with a web dashboard for teachers and admins, and a native mobile application for students, utilizing dynamically rotating QR codes and multi-factor validation (GPS, device fingerprinting, etc.) to ensure integrity.

## 🏗️ Architecture Overview

The system is built on a modern, high-performance monorepo stack:

- **Runtime & Package Manager**: Bun
- **Backend (API)**: ElysiaJS, PostgreSQL (Prisma ORM), Redis (BullMQ, Nonce, Cache)
- **Frontend (Web)**: React (TanStack Router, Tailwind CSS, shadcn-ui, Zustand)
- **Frontend (Mobile)**: React Native (Expo, NativeWind, Vision Camera for QR scanning)
- **Authentication**: Better Auth with the Organization plugin

Read the full [Architecture & Implementation Plan](./architecture.md) for detailed technical decisions.

## 🚀 Key Features

- **Rotating QR Codes**: Server-signed QR tokens refreshed every 5-10s via WebSockets.
- **Multi-Factor Validation Pipeline**:
  - GPS Geofencing
  - Device Fingerprinting & Binding
  - Impossible Travel Detection
  - Pluggable checks (WiFi BSSID, BLE Beacons, Device Integrity, Liveness)
- **Live Attendance Dashboard**: Real-time counter and student feed via WebSockets.
- **Complex Timetable Integration**: Handles multiple programs, semesters, divisions, and shared sessions.
- **Anomaly Detection & Auditing**: Comprehensive alerts for suspicious attendance behavior.

## 📂 Project Structure

```text
secured_attendance/
├── apps/
│   ├── web/         # Teacher/Admin Web Dashboard (TanStack Router + React)
│   ├── native/      # Student Mobile Application (Expo + React Native)
│   └── server/      # Backend API Gateway (ElysiaJS)
├── packages/
│   ├── auth/        # Better Auth configuration
│   ├── db/          # Prisma schema and client
│   └── env/         # Environment variable validation
```

## 🛠️ Local Development

Ensure you have [Bun](https://bun.sh) and Docker installed.

1. **Install Dependencies**
   ```sh
   bun install
   ```

2. **Setup Database & Redis**
   ```sh
   docker compose -f packages/db/docker-compose.yml up -d
   bun db:push
   ```

3. **Environment Variables**
   Copy `.env.example` to `.env` in the respective directories and fill in the required values (e.g., Database URL, Better Auth secret, QR signing secret).

4. **Start Development Servers**
   Run the generated apps in separate terminals to maintain their native watchers and logs.

   ```sh
   # Start the backend server
   bun dev:server
   
   # Start the web dashboard
   bun dev:web
   
   # Start the mobile app
   bun dev:native
   ```

## 📜 Maintenance
Please refer to `AGENTS.md` for AI assistant instructions regarding project context and technology stacks.
