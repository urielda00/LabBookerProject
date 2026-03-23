# Docker Setup

## Quick Start

```bash
# Development (hot reload, debug ports exposed)
docker compose -f docker-compose.dev.yml up

# Production (nginx, auth, resource limits)
docker compose -f docker-compose.prod.yml up -d
```

## Architecture

| Service | Dev | Prod |
|---------|-----|------|
| **Frontend** | React dev server (port 3000) | — |
| **Nginx** | — | Builds frontend + serves static + reverse proxies /api & /ws (port 80) |
| **Backend** | Nodemon with polling (port 5000) | Node.js (internal only, no port exposed) |
| **MongoDB** | Local container, no auth, port 27018 exposed | External managed service (e.g. MongoDB Atlas) |
| **Redis** | Local container, no auth, port 6379 exposed | Local container, password protected, no port exposed |

Dev uses `frontend/dockerfile` (React dev server). Prod uses `nginx/Dockerfile` (builds frontend + serves via nginx with API/WebSocket reverse proxy).

## Hot Reload (Development)

Hot reload works out of the box, including on Windows + Docker:

- **Frontend:** Source mounted via volume, `WATCHPACK_POLLING=true` for file watcher support
- **Backend:** Source mounted via volume, `nodemon --legacy-watch` for polling mode
- **node_modules:** Isolated in named volumes to avoid host/container conflicts

## Environment Variables

1. Copy the backend env template:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Fill in the required values (JWT secrets, URLs, etc.)
3. For production, set `MONGO_URI` in `backend/.env` to your managed MongoDB connection string (e.g. MongoDB Atlas).
4. Also create a `.env` at the project root with:

| Variable | Description |
|----------|-------------|
| `REDIS_PASSWORD` | Redis auth password |
| `ROOT_EMAIL` | Root/superadmin account email |
| `ROOT_PASSWORD` | Root/superadmin account password |
| `PRIMARY_APPROVAL_MANAGER` | Manager email for user approvals |
| `SECONDARY_APPROVAL_MANAGER` | Fallback manager email |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | SendGrid sender email |

## Stopping & Cleanup

```bash
# Stop containers
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (fresh start)
docker compose -f docker-compose.dev.yml down -v
```
