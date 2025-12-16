# VPS RECOVERY GUIDE - URGENT FIX

## ⚠️ YOUR DATA IS SAFE

Your PostgreSQL database and cloudflare-certs are preserved. Follow these steps to restore your app.

---

## Step 1: Backup Everything (CRITICAL - Do This First!)

SSH into your VPS and backup your data:

```bash
ssh admin@powermental.fit
cd ~/usdt-exchange

# 1. Backup database (MOST IMPORTANT)
docker compose -f docker-compose.production.yml exec db pg_dump -U postgres usdt_exchange > ~/database-backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Verify backup was created
ls -lh ~/database-backup-*.sql

# 3. Backup cloudflare-certs folder
cp -r cloudflare-certs ~/cloudflare-certs-backup

# 4. List what's in the backup
ls -la ~/cloudflare-certs-backup/
```

**IMPORTANT:** Don't proceed until you see the backup files!

---

## Step 2: Pull Fixed Code from GitHub

```bash
cd ~/usdt-exchange

# Stop all containers (data is safe in volumes)
docker compose -f docker-compose.production.yml down

# Backup current directory
cd ~
mv usdt-exchange usdt-exchange-broken-backup

# Clone fresh from GitHub (it's public now)
git clone https://github.com/power19/Exchange.git usdt-exchange
cd usdt-exchange

# Switch to the fixed branch
git checkout claude/code-review-01PGZViB5doN3UUxLr2Wn11M

# Restore your cloudflare-certs folder
cp -r ~/cloudflare-certs-backup cloudflare-certs

# Verify certs are there
ls -la cloudflare-certs/
```

---

## Step 3: Rebuild Docker Image with Fix

**From your PC (PowerShell):**

```powershell
cd C:\Users\brian\Exchange

# Pull the fixed code
git pull

# Login to Docker Hub
docker login

# Build the FIXED image
cd backend
docker build -t power1984/powermental-app:latest .

# Push to Docker Hub
docker push power1984/powermental-app:latest

cd ..
```

---

## Step 4: Restart VPS with Fixed Image

**Back on VPS:**

```bash
cd ~/usdt-exchange

# Pull the fixed Docker image
docker compose -f docker-compose.production.yml pull backend

# Start everything
docker compose -f docker-compose.production.yml up -d

# Wait for startup
sleep 15

# Check all containers are running
docker compose -f docker-compose.production.yml ps
```

**Expected output:**
```
NAME            STATUS
nginx-proxy     running
usdt-db         running
usdt-backend    running
usdt-frontend   running
```

---

## Step 5: Verify Everything Works

```bash
# Check backend is responding
curl https://api.powermental.fit/health

# Check frontend is accessible
curl -I https://main.powermental.fit

# Check database has data
docker compose -f docker-compose.production.yml exec db psql -U postgres -d usdt_exchange -c "SELECT COUNT(*) FROM purchases;"

# Check backend logs
docker compose -f docker-compose.production.yml logs backend --tail=50
```

---

## Step 6: Test Your Website

Open in browser:
- https://main.powermental.fit
- https://dai.powermental.fit
- https://patty.powermental.fit

All your data should be there!

---

## What Was Fixed

The push notification code was breaking the web build because Vite tried to bundle Capacitor modules that are only meant for mobile apps. I fixed this by configuring Vite to externalize `@capacitor/push-notifications`.

**Files changed:**
- `frontend/vite.config.ts` - Added `rollupOptions.external` configuration

---

## If Something Goes Wrong

### Problem: Database is empty

**Solution: Restore from backup**
```bash
cd ~/usdt-exchange
docker compose -f docker-compose.production.yml exec -T db psql -U postgres -d usdt_exchange < ~/database-backup-YYYYMMDD-HHMMSS.sql
```

### Problem: Certificates not working

**Solution: Restore cloudflare-certs**
```bash
cd ~/usdt-exchange
rm -rf cloudflare-certs
cp -r ~/cloudflare-certs-backup cloudflare-certs
docker compose -f docker-compose.production.yml restart nginx-proxy
```

### Problem: Backend won't start

**Solution: Check logs**
```bash
docker compose -f docker-compose.production.yml logs backend
```

If you see "Cannot find module", rebuild the Docker image (Step 3).

---

## Your Data is in Docker Volumes

Even when you run `docker compose down`, your data persists in Docker volumes:

```bash
# List Docker volumes
docker volume ls | grep usdt

# Your database data is in: pgdata volume
# Your nginx config is in: vhost volume
# Your SSL certs are in: cloudflare-certs folder (mapped volume)
```

The data is NEVER deleted unless you explicitly run `docker compose down -v` (with `-v` flag).

---

## Emergency Contact

If you're still having issues after following this guide, check:
1. Docker logs: `docker compose -f docker-compose.production.yml logs`
2. System resources: `df -h` and `free -m`
3. Docker status: `docker ps -a`
