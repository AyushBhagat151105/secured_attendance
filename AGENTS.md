# secured_attendance

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Typescript

## Tech Stack

- **Runtime**: bun
- **Package Manager**: bun

### Frontend

- Framework: tanstack-router, native-uniwind
- CSS: tailwind
- UI Library: shadcn-ui
- State: zustand

### Backend

- Framework: elysia
- Validation: zod

### Database

- Database: postgres
- ORM: prisma

### Authentication

- Provider: better-auth-organizations

### Additional Features

- Testing: vitest
- Job Queue: bullmq
- Logging: winston

## Project Structure

```
secured_attendance/
├── apps/
│   ├── web/         # Frontend application
│   ├── native/      # Mobile application (React Native)
│   └── server/      # Backend API
├── packages/
│   ├── auth/        # Authentication
│   └── db/          # Database schema
```

## Common Commands

- `bun install` - Install dependencies
- `bun dev` - Start development server
- `bun build` - Build for production
- `bun test` - Run tests
- `bun db:push` - Push database schema
- `bun db:studio` - Open database UI

## Maintenance

Keep AGENTS.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.
