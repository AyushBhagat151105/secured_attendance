# secured_attendance

This file provides context about the project, strict coding standards, and architectural guidelines for AI assistants.

## Project Overview

- **Ecosystem**: Typescript
- **Architecture**: Monorepo (Turborepo) with isolated apps and shared packages.

## Tech Stack

- **Runtime & Package Manager**: bun
- **Frontend (Web)**: tanstack-router, tailwind, shadcn-ui, zustand, tanstack-query
- **Frontend (Mobile)**: react-native (expo), native-uniwind (tailwind v4)
- **Backend (API)**: elysia, zod (validation)
- **Database**: postgres, prisma (ORM)
- **Authentication**: better-auth (with organization plugin)
- **Additional**: vitest (testing), bullmq (job queue), winston (logging)

## Project Structure & Architecture Rules

```text
secured_attendance/
├── apps/
│   ├── web/         # Teacher/Admin Web Dashboard (React, TanStack Router)
│   ├── native/      # Student Mobile Application (React Native, Expo)
│   └── server/      # Backend API Gateway (ElysiaJS)
├── packages/
│   ├── auth/        # Better Auth configuration
│   ├── db/          # Prisma schema and generated client
│   └── env/         # Environment variable validation
```

### Monorepo Boundaries
- **Source of Truth**: Shared packages (`packages/*`) are the single source of truth.
  - `@secured_attendance/db`: ALL Prisma models and client exports.
  - `@secured_attendance/auth`: Better Auth config.
  - `@secured_attendance/env`: Type-safe env validation.
- **No Cross-App Imports**: Apps (`apps/web`, `apps/native`, `apps/server`) must NEVER import from each other directly. They can only import from `packages/*`.

### Server Architecture (ElysiaJS)
- **Method Chaining**: Must chain methods. Each method returns a new type reference. Do not reassign the app instance.
- **Explicit Dependencies**: Each Elysia instance is independent. Declare what you use (e.g. `.use(auth)` before accessing its context).
- **Validation**: Every endpoint MUST have a Zod schema for validation (body, query, params, response).
- **Grouping**: Use Elysia's `.group()` and `.guard()` to group routes and apply middleware (like authentication and role checks).
- **Models**: Export validation models and type of validation models. Register Models via `Elysia.model({ ...models })` and prefix appropriately.
- **Eden Treaty (RPC)**: Export the root `App` type from the backend and consume it on the frontend using `@elysiajs/eden`. This provides end-to-end type safety without generating code.

### Frontend Architecture (Web - React & TanStack)
- **Eden Treaty**: Use the `@elysiajs/eden` `treaty` client to interact with the backend API. Handle errors by checking `error` objects before accessing `data`.
- **TanStack Router**: Prefer file-based routing. Use route loaders for data fetching with `queryOptions` for type inference. Always validate search params. Define `loaderDeps` for cache control. Use `.lazy.tsx` for code splitting non-critical routes.
- **TanStack Query**: Always use arrays for query keys. Organize keys hierarchically. Always invalidate related queries after mutations. Set appropriate `staleTime` and `gcTime`.
- **React Best Practices (Vercel Guidelines)**: 
  - Eliminate waterfalls: Use `Promise.all()` for independent operations.
  - Re-renders: Extract expensive work into memoized components, use primitive dependencies in effects, subscribe to derived booleans, not raw values.
  - Rendering: Extract static JSX outside components. Avoid inline style objects where possible.

### Frontend Architecture (Native - React Native & Expo)
- **List Performance**: Use `FlashList` for large lists (CRITICAL). Memoize list item components. Extract functions outside render to stabilize references.
- **Navigation**: Use native stack and native tabs over JS navigators.
- **Animation**: Animate ONLY transform and opacity. Use `useDerivedValue` for computed animations. Use `Gesture.Tap` instead of `Pressable`.
- **UI Patterns**: Use `expo-image` for all images. Handle safe areas correctly.

### Frontend Design & UI/UX
- **Design Principles**: Make deliberate, opinionated choices about palette, typography, and layout. No default/templated feel.
- **Typography**: Pair display and body faces deliberately with clear type scale, weights, and spacing.
- **Copy & Writing**: Use active voice ("Save changes" not "Submit"). Treat failure and emptiness as moments for direction, explaining what went wrong and how to fix it plainly. 
- **Simplicity**: Cut any decoration that does not serve the brief. Ensure responsive design down to mobile.

## Coding Standards & Best Practices

### General TypeScript Rules
- **Strict Mode**: TypeScript strict mode is enabled. NEVER use `any`. Use `unknown` if absolutely necessary, but prefer strict typing.
- **No Implicit Returns**: Always define return types for API handlers and complex functions.
- **Naming Conventions**:
  - `camelCase` for variables, functions, and instances.
  - `PascalCase` for types, interfaces, Prisma models, and React components.
  - `kebab-case` for file and directory names (e.g., `device-binding.ts`, `auth-client.ts`).
- **File Length**: Maximum 300 lines per file. If a file grows larger, split it into smaller, cohesive modules.

### Security Standards
- **Zero Trust**: Never trust client input. Re-validate everything server-side using Zod.
- **No Leakage**: Never leak detailed security check failures to the client (e.g., return "Location error" instead of "GPS outside geofence by 15 meters"). Detailed logs go to the audit system.
- **Single-Use Nonce**: QR tokens must use single-use nonces verified atomically via Redis Lua scripts to prevent replay attacks.
- **Rate Limiting**: Apply rate limits to all sensitive endpoints (login, attendance submission, device binding).
- **Auditing**: Every security-relevant event must be logged to the audit system asynchronously (via BullMQ).

### Error Handling & Logging
- **HTTP Errors**: Use Elysia's `error()` constructor for returning HTTP errors. NEVER throw raw unhandled exceptions in route handlers.
- **Logging**: Use `winston` for all server-side logs. NEVER use `console.log` in production code.

### Git Conventions
- **Branch Naming**: `feature/phase-X-name`, `fix/description`, `chore/description`.
- **Commit Messages**: Use Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).

## Common Commands

- `bun install` - Install dependencies
- `bun dev` - Start all development servers
- `bun dev:server` - Start Elysia API
- `bun dev:web` - Start TanStack Router web dashboard
- `bun dev:native` - Start Expo app
- `bun test` - Run tests
- `bun db:push` - Push Prisma schema to database
- `bun db:studio` - Open Prisma Studio

## Maintenance

Keep `AGENTS.md` updated when:
- Adding/removing core dependencies
- Changing structural paradigms
- Establishing new coding conventions
- Adding new shared packages

AI assistants should proactively consult and follow these rules, and suggest updates to this file when they notice relevant changes or recurring patterns.
