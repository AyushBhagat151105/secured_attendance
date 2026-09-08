# Dockerfile for secured_attendance server
# Optimized multi-stage build for Docker deployment

# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy monorepo package files
COPY package.json bun.lock* ./
COPY apps/server/package.json ./apps/server/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/env/package.json ./packages/env/
COPY packages/validators/package.json ./packages/validators/
COPY packages/config/package.json ./packages/config/

# Install dependencies without running pre/post scripts before source is copied
RUN bun install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma Client and apply wasm memory patch
RUN bun run db:generate
RUN bun scripts/patch-prisma-wasm.js

# Build the server application
RUN bun run build --filter=server

# Production stage
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Kolkata

# Copy package configurations and monorepo files for runtime migrations (db:push, db:generate)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "dist/index.mjs"]
