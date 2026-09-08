# Dockerfile for secured_attendance TanStack Router SPA
# Static file serving with nginx for Docker deployment

FROM oven/bun:1 AS builder

WORKDIR /app

# Copy monorepo package files
COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/validators/package.json ./packages/validators/
COPY packages/config/package.json ./packages/config/

RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

ARG VITE_SERVER_URL=http://localhost:3001
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN bun run build --filter=web

# Production stage with nginx
FROM nginx:alpine AS runner

# Copy nginx configuration for SPA routing
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
