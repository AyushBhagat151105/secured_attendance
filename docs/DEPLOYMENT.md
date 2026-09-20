# Hostinger VPS Deployment & Production Operations Guide

> **Campus**: CHARUSAT (Charotar University of Science & Technology), Changa, Gujarat  
> **Department**: Smt. Chandaben Mohanbhai Patel Institute of Computer Applications (CMPICA)  
> **Live Production Endpoints**:
> - **Web Dashboard**: `https://attendance.ayushbhagat.com`
> - **Backend API & Docs**: `https://attendance-api.ayushbhagat.com` (Docs at `/scalar`)
> - **Direct APK Download**: `https://attendance-api.ayushbhagat.com/download/secured-attendance.apk`

---

## 1. Production Topology & Architecture

The production environment is hosted on a high-performance **Hostinger Linux VPS** configured with Caddy as the edge TLS reverse proxy and Docker Compose managing backend services.

```text
                     [ Internet / Campus Wi-Fi ]
                                  │
                                  ▼
           [ Cloudflare DNS & Edge Network (SSL / Proxy) ]
                                  │
                                  ▼
              [ Hostinger VPS (Ubuntu 24.04 LTS) ]
                                  │
            ┌─────────────────────┴─────────────────────┐
            │            Caddy Reverse Proxy            │
            │         (Automatic Let's Encrypt)         │
            └──────────┬──────────────────────┬─────────┘
                       │                      │
         :443 (attendance)                    │ :443 (attendance-api)
                       │                      │
                       ▼                      ▼
             [ Static Web Root ]      [ Docker Bridge :3006 ]
           /var/www/secured-attendance        │
                                              ▼
                                 ┌─────────────────────────┐
                                 │   Elysia Server (Bun)   │
                                 │   Container (:3000)     │
                                 └────────────┬────────────┘
                                              │ :6379
                                              ▼
                                 ┌─────────────────────────┐
                                 │      Redis 7 Alpine     │
                                 │   (Session / QR Cache)  │
                                 └─────────────────────────┘
                                              │
                                              ▼
                              [ NeonDB Serverless PostgreSQL ]
                              (External Multi-Schema Database)
```

---

## 2. Docker Compose Production Services (`docker-compose.prod.yml`)

The backend container environment is defined in `docker-compose.prod.yml` and managed in `/root/secured_attendance`:

```yaml
name: secured_attendance_prod

services:
  server:
    image: ghcr.io/ayushbhagat151105/secured_attendance-server:latest
    container_name: secured_attendance-server
    restart: unless-stopped
    ports:
      - "3006:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - TZ=Asia/Kolkata
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL:-https://attendance-api.ayushbhagat.com}
      - CORS_ORIGIN=${CORS_ORIGIN:-https://attendance.ayushbhagat.com}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL:-admin@charusat.ac.in}
      - SUPER_ADMIN_NAME=${SUPER_ADMIN_NAME:-System Administrator}
      - DEFAULT_TEACHER_PASSWORD=${DEFAULT_TEACHER_PASSWORD:-Charusat@123}
      - DEFAULT_STUDENT_PASSWORD=${DEFAULT_STUDENT_PASSWORD:-Charusat@123}
    volumes:
      # Mounts both OTA JS bundles (/updates) and compiled binaries (/downloads)
      - ./uploads:/app/apps/server/uploads
    depends_on:
      - redis
    networks:
      - secured_attendance-network

  redis:
    image: redis:7-alpine
    container_name: secured_attendance-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - secured_attendance-network

networks:
  secured_attendance-network:
    driver: bridge

volumes:
  redis_data:
```

### Persistent Volume Directory Structure on VPS Host:
```text
/root/secured_attendance/uploads/
├── downloads/
│   └── secured-attendance.apk     <-- Direct student installer
└── updates/
    ├── metadata.json              <-- Self-hosted OTA manifest
    └── _expo/static/js/android/   <-- Hermes bytecode bundles (.hbc)
```

---

## 3. Automated CI/CD Workflows (GitHub Actions)

All builds and deployments are automated through GitHub Actions workflows located in `.github/workflows/`:

| Workflow File | Trigger | Responsibility & Target |
| :--- | :--- | :--- |
| **`pr.yml`** | Push/PR to `main` | Runs `bun run check-types`, all 87 unit and E2E tests, and verifies production compilation. |
| **`deploy-server.yml`** | Push touching `apps/server/**`, `packages/**`, or `docker-compose.prod.yml` | Builds multi-stage Docker image, pushes to GitHub Container Registry (`ghcr.io`), logs into VPS via SSH, pulls new image, and restarts container. |
| **`deploy-web.yml`** | Push touching `apps/web/**` | Runs `vite build`, transfers static HTML/JS/CSS to `/var/www/secured-attendance-web` via SCP. |
| **`deploy-ota.yml`** | Push touching `apps/native/src/**` | Exports Hermes JS bundle using Expo CLI, updates `metadata.json`, and syncs files to `/root/.../uploads/updates` via SCP in under 60 seconds. |
| **`deploy-apk.yml`** | Version tag `v*` or manual dispatch | Runs full Android Gradle release build (`arm64-v8a`), minifies with R8, uploads artifact to GitHub Releases, and SCPs binary to `/root/.../uploads/downloads/secured-attendance.apk`. |

---

## 4. Required GitHub Secrets & Environment Variables

Configure the following secrets in GitHub under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example / Format |
| :--- | :--- | :--- |
| `VPS_HOST` | Hostinger VPS IP address or hostname | `147.93.xxx.xxx` |
| `VPS_SSH_KEY` | Private OpenSSH Key for root authentication | `-----BEGIN OPENSSH PRIVATE KEY...` |
| `DATABASE_URL` | NeonDB pooled connection string with SSL | `postgresql://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require` |
| `BETTER_AUTH_SECRET` | 32+ character cryptographic secret | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Production server URL | `https://attendance-api.ayushbhagat.com` |
| `CORS_ORIGIN` | Allowed web dashboard origin | `https://attendance.ayushbhagat.com` |

---

## 5. Hostinger VPS Initial Setup Runbook

If provisioning a new Hostinger VPS or migrating to a new machine, execute the following commands as `root`:

```bash
# 1. Update system packages
apt update && apt upgrade -y
apt install -y curl git ufw caddy

# 2. Install Docker Engine & Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker

# 3. Clone repository into /root
cd /root
git clone https://github.com/ayushbhagat151105/secured_attendance.git
cd /root/secured_attendance

# 4. Create persistent upload directories
mkdir -p /root/secured_attendance/uploads/updates
mkdir -p /root/secured_attendance/uploads/downloads
mkdir -p /var/www/secured-attendance-web

# 5. Configure production environment file
cp .env.production.example .env
# Edit .env with your DATABASE_URL, BETTER_AUTH_SECRET, etc.
nano .env

# 6. Configure Caddy Reverse Proxy (/etc/caddy/Caddyfile)
cat << 'EOF' > /etc/caddy/Caddyfile
attendance.ayushbhagat.com {
    root * /var/www/secured-attendance-web
    file_server
    try_files {path} /index.html
    encode zstd gzip
}

attendance-api.ayushbhagat.com {
    reverse_proxy 127.0.0.1:3006
    encode zstd gzip
}
EOF

# Restart Caddy to obtain automatic TLS certificates
systemctl restart caddy
```

---

## 6. Daily Maintenance & Operational Commands

### Checking Live Service Health
```bash
# View running containers
docker compose -f /root/secured_attendance/docker-compose.prod.yml ps

# Follow live backend logs
docker compose -f /root/secured_attendance/docker-compose.prod.yml logs -f --tail=100 server

# Follow Redis logs
docker compose -f /root/secured_attendance/docker-compose.prod.yml logs -f redis
```

### Restarting Services Manually
```bash
cd /root/secured_attendance
docker compose -f docker-compose.prod.yml restart server
```

### Checking Edge Downloads
```bash
# Verify direct APK binary availability
curl -I https://attendance-api.ayushbhagat.com/download/secured-attendance.apk

# Verify app version metadata
curl https://attendance-api.ayushbhagat.com/api/app/version
```

### Rollback Runbook
If a newly deployed image causes issues:
```bash
cd /root/secured_attendance
# Pull a specific prior SHA tag or checkout previous commit
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```
