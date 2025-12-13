# Docker Image Build and Push Guide

This guide explains how to build and push Docker images to Docker Hub for deployment.

## Prerequisites

1. **Docker Desktop** installed and running on your local machine
2. **Docker Hub account** (free): https://hub.docker.com
3. Images will be named: `your-username/usdt-exchange-backend` and `your-username/usdt-exchange-frontend`

## One-Time Setup

### 1. Create Docker Hub Account

Go to https://hub.docker.com and sign up for a free account.

### 2. Login to Docker Hub

Open a terminal and login:
```bash
docker login
```

Enter your Docker Hub username and password.

### 3. Update Your Docker Username

Edit `.env.production` and set your Docker Hub username:
```bash
DOCKER_USERNAME=your-dockerhub-username
```

## Building and Pushing Images

### Quick Start (Recommended)

**Windows PowerShell:**
```powershell
cd C:\Users\brian\Documents\Exchange
.\build-and-push.ps1
```

**Git Bash / Linux / Mac:**
```bash
cd /c/Users/brian/Documents/Exchange
./build-and-push.sh
```

This will:
1. ✅ Build backend Docker image
2. ✅ Build frontend Docker image
3. ✅ Push both images to Docker Hub
4. ✅ Tag them as `latest`

### Advanced Usage

**Specify custom tag (e.g., version number):**

PowerShell:
```powershell
.\build-and-push.ps1 -ImageTag "v1.0.0"
```

Bash:
```bash
./build-and-push.sh brianpower v1.0.0
```

**Specify custom username and tag:**

PowerShell:
```powershell
.\build-and-push.ps1 -DockerUsername "myusername" -ImageTag "v1.0.0"
```

Bash:
```bash
./build-and-push.sh myusername v1.0.0
```

## Deploying to VPS

After pushing images to Docker Hub, deploy them on your VPS:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to project directory
cd /opt/usdt-exchange

# Pull latest images from Docker Hub
docker-compose -f docker-compose.prod.yml --env-file .env.production pull

# Restart services with new images
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## Update Workflow

When you make code changes:

1. **Local Machine:** Build and push new images
   ```powershell
   .\build-and-push.ps1
   ```

2. **VPS:** Pull and deploy new images
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production pull
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

## Troubleshooting

### "unauthorized: authentication required"

You're not logged in to Docker Hub. Run:
```bash
docker login
```

### "denied: requested access to the resource is denied"

The repository doesn't exist or you don't have permission. Make sure:
- You're logged in with `docker login`
- Your username in `.env.production` matches your Docker Hub username
- The repository exists on Docker Hub (it will be created automatically on first push)

### Build fails

Check:
- Docker Desktop is running
- You're in the correct directory (`C:\Users\brian\Documents\Exchange`)
- No syntax errors in Dockerfiles

### Images are too large

Current image sizes (approximate):
- Backend: ~150-200 MB (Node.js Alpine)
- Frontend: ~25-30 MB (Nginx Alpine)

These are already optimized with multi-stage builds.

## Docker Hub Repository

Your images will be available at:
- https://hub.docker.com/r/your-username/usdt-exchange-backend
- https://hub.docker.com/r/your-username/usdt-exchange-frontend

You can make these public (free) or private (requires paid plan).

## Security Notes

- **Never commit Docker Hub credentials** to git
- Images are public by default on free Docker Hub accounts
- For private images, upgrade to Docker Hub Pro
- Consider using GitHub Container Registry (ghcr.io) as an alternative

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker login` | Login to Docker Hub |
| `.\build-and-push.ps1` | Build and push images (PowerShell) |
| `./build-and-push.sh` | Build and push images (Bash) |
| `docker images` | List local Docker images |
| `docker rmi <image>` | Remove local image |
| `docker-compose pull` | Pull images from Docker Hub |

## Alternative: Manual Build and Push

If you prefer to build manually:

```bash
# Build backend
docker build -t brianpower/usdt-exchange-backend:latest ./backend

# Build frontend
docker build -t brianpower/usdt-exchange-frontend:latest ./frontend

# Push backend
docker push brianpower/usdt-exchange-backend:latest

# Push frontend
docker push brianpower/usdt-exchange-frontend:latest
```

## Next Steps

After building and pushing images:

1. Follow `DEPLOYMENT.md` to deploy to your VPS
2. Configure DNS records for your subdomains
3. Update `.env.production` with secure passwords
4. Deploy with `docker-compose up -d`

---

**Questions?** Check the main `DEPLOYMENT.md` guide or Docker documentation.
