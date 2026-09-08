FROM oven/bun:1

WORKDIR /app

# Copy full repository
COPY . .

# Provide build-time placeholder DATABASE_URL
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Install all monorepo dependencies
RUN bun install --frozen-lockfile

# Generate Prisma Client and apply wasm memory patch
RUN bun run db:generate
RUN bun scripts/patch-prisma-wasm.js

# Build server distribution
RUN bun run build --filter=server

WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Kolkata

EXPOSE 3000

CMD ["bun", "run", "dist/index.mjs"]
