# VPS Deployment Guide

This guide will help you deploy the USDT Exchange System to your VPS with automatic SSL certificates and subdomain routing.

## Prerequisites

1. **VPS Server** with Ubuntu 20.04/22.04 (or similar Linux)
2. **Domain names** configured with DNS A records pointing to your VPS IP:
   - `main.powermental.fit` → Main Dashboard (Brian)
   - `patty.powermental.fit` → Patty's Dashboard
   - `dai.powermental.fit` → Dairimar's Dashboard
   - `api.powermental.fit` → Backend API
3. **SSH access** to your VPS
4. **Git** installed on your local machine

## Step 1: Prepare VPS

SSH into your VPS:
```bash
ssh root@your-vps-ip
```

### Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

### Install Git

```bash
sudo apt install git -y
```

## Step 2: Build and Push Docker Images (On Your Local Machine)

Before deploying to VPS, you need to build Docker images and push them to Docker Hub.

### Create Docker Hub Account

1. Go to https://hub.docker.com
2. Sign up for a free account
3. Remember your username (you'll use it below)

### Login to Docker Hub

On your LOCAL machine:
```bash
docker login
# Enter your Docker Hub username and password
```

### Build and Push Images

**Option A: Using PowerShell (Windows - Recommended)**
```powershell
cd C:\Users\brian\Documents\Exchange
.\build-and-push.ps1
```

**Option B: Using Bash (Git Bash on Windows, or Linux/Mac)**
```bash
cd /c/Users/brian/Documents/Exchange
./build-and-push.sh
```

This will:
- Build backend and frontend Docker images
- Tag them with your Docker Hub username
- Push them to Docker Hub

**Optional: Specify custom username or tag:**
```powershell
.\build-and-push.ps1 -DockerUsername "yourusername" -ImageTag "v1.0.0"
```

### Update .env.production

If your Docker Hub username is different from "brianpower", update `.env.production`:
```bash
DOCKER_USERNAME=your-dockerhub-username
```

## Step 3: Transfer Configuration to VPS

You only need to transfer the configuration files, not the entire codebase.

### Option A: Manual Transfer (Simple)

On your VPS:
```bash
cd /opt
sudo mkdir -p usdt-exchange
cd usdt-exchange

# Create the configuration file
sudo nano .env.production
```

Paste the contents from your local `.env.production` file, then save (Ctrl+X, Y, Enter).

Then download the docker-compose file:
```bash
# Download docker-compose.prod.yml from your repository
# OR create it manually with nano and copy the contents
sudo nano docker-compose.prod.yml
```

### Option B: Via SCP (If you prefer)

On your LOCAL machine:
```bash
# Transfer only the necessary files
scp docker-compose.prod.yml root@your-vps-ip:/opt/usdt-exchange/
scp .env.production root@your-vps-ip:/opt/usdt-exchange/
```

## Step 4: Configure Environment Variables

On the VPS, edit the production environment file:

```bash
cd /opt/usdt-exchange
nano .env.production
```

**IMPORTANT:** Update these values with secure passwords:

```bash
# Your actual domains
MAIN_DOMAIN=main.powermental.fit
PATTY_DOMAIN=patty.powermental.fit
DAI_DOMAIN=dai.powermental.fit
API_DOMAIN=api.powermental.fit

# Your email for SSL certificate notifications
LETSENCRYPT_EMAIL=your-email@example.com

# Secure passwords (CHANGE THESE!)
DB_PASSWORD=YourSecureDatabasePassword123!
JWT_SECRET=your-very-secure-random-jwt-secret-at-least-32-chars-long
ADMIN_PASSWORD=YourSecureAdminPassword123!
```

**Generate a secure JWT secret:**
```bash
openssl rand -base64 48
```

Save and exit (Ctrl+X, then Y, then Enter).

## Step 5: Deploy the Application

```bash
# Make sure you're in the project directory
cd /opt/usdt-exchange

# Pull the pre-built images from Docker Hub
docker-compose -f docker-compose.prod.yml --env-file .env.production pull

# Start all services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

This will:
- Pull the pre-built backend and frontend images from Docker Hub
- Start PostgreSQL database
- Start nginx-proxy for subdomain routing
- Start Let's Encrypt companion for automatic SSL
- Run database migrations automatically
- Create the admin user

**Note:** No building on the VPS! Images are pre-built and pulled from Docker Hub.

## Step 6: Monitor Deployment

```bash
# Check if all containers are running
docker-compose -f docker-compose.prod.yml ps

# Watch the logs
docker-compose -f docker-compose.prod.yml logs -f

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f db
```

Wait for SSL certificates to be generated (this may take 2-5 minutes).

## Step 7: Verify Deployment

### Check DNS Resolution

From your local machine:
```bash
ping main.powermental.fit
ping patty.powermental.fit
ping dai.powermental.fit
ping api.powermental.fit
```

All should resolve to your VPS IP.

### Test the Dashboards

Open in your browser:
- `https://main.powermental.fit` - Main Dashboard (Brian)
- `https://patty.powermental.fit` - Patty's Dashboard
- `https://dai.powermental.fit` - Dairimar's Dashboard

All should:
- ✅ Load over HTTPS (SSL certificate valid)
- ✅ Show the correct dashboard
- ✅ Connect to the backend API

### Test API

```bash
curl https://api.powermental.fit/api/balances
```

Should return JSON with balances.

## Step 8: Build Mobile Apps

Now that the backend is deployed, build the Android apps for Dairimar and Patty.

### Production URLs (Already Configured)

The `.env` files are already configured to use:
- **Dairimar's app**: `https://api.powermental.fit/api`
- **Patty's app**: `https://api.powermental.fit/api`

### Build Dairimar's App

```bash
cd frontend
npm run sync:dairimar
# Then open in Android Studio and build APK
```

### Build Patty's App

```bash
cd frontend
npm run sync:patty
# Then open in Android Studio and build APK
```

**See `MOBILE-APP-BUILD.md` for complete mobile app build instructions.**

## Maintenance Commands

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Application (after code changes)

**On your LOCAL machine:**
```bash
# 1. Build and push new images
cd C:\Users\brian\Documents\Exchange
.\build-and-push.ps1
```

**On your VPS:**
```bash
# 2. Pull the latest images and restart
cd /opt/usdt-exchange
docker-compose -f docker-compose.prod.yml --env-file .env.production pull
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Database Backup
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres usdt_exchange > backup-$(date +%Y%m%d).sql

# Restore from backup
cat backup-20250101.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres usdt_exchange
```

### Automated Daily Backups

Create a cron job:
```bash
crontab -e
```

Add this line (runs at 2 AM daily):
```bash
0 2 * * * cd /opt/usdt-exchange && docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres usdt_exchange > /opt/backups/usdt-$(date +\%Y\%m\%d).sql
```

Create backup directory:
```bash
sudo mkdir -p /opt/backups
```

## Troubleshooting

### SSL Certificates Not Working

Check Let's Encrypt logs:
```bash
docker-compose -f docker-compose.prod.yml logs letsencrypt
```

Common issues:
- DNS not propagated yet (wait 1-2 hours)
- Port 80/443 blocked by firewall
- Domain not pointing to correct IP

### Backend Not Starting

```bash
docker-compose -f docker-compose.prod.yml logs backend
```

Common issues:
- Database migration failed
- Environment variables not set correctly
- Database connection issue

### Frontend Can't Connect to Backend

Check nginx-proxy logs:
```bash
docker-compose -f docker-compose.prod.yml logs nginx-proxy
```

Verify CORS settings in `.env.production`.

### Check Container Status

```bash
docker-compose -f docker-compose.prod.yml ps
docker stats
```

## Security Checklist

- [ ] Changed `DB_PASSWORD` from default
- [ ] Changed `JWT_SECRET` to random string (min 32 chars)
- [ ] Changed `ADMIN_PASSWORD` from default
- [ ] Updated `LETSENCRYPT_EMAIL` to your email
- [ ] Verified SSL certificates are working (https://)
- [ ] Configured firewall (allow ports 22, 80, 443 only)
- [ ] Set up automated database backups
- [ ] Tested all three subdomains
- [ ] Updated mobile app API URL to production

## Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Next Steps

1. Test all workflows (buy USDT, transfer, convert, fulfill orders)
2. Train users on the dashboards
3. Monitor logs regularly
4. Set up monitoring/alerting (optional: Grafana, Prometheus)
5. Schedule regular backups

## Support

If you encounter issues:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verify environment variables: `cat .env.production`
3. Check container status: `docker-compose -f docker-compose.prod.yml ps`
4. Restart services: `docker-compose -f docker-compose.prod.yml restart`

---

**Deployment Completed!** 🎉

Your USDT Exchange System is now live at:
- 🏢 Main: https://main.powermental.fit
- 👤 Patty: https://patty.powermental.fit
- 👤 Dairimar: https://dai.powermental.fit
- 🔌 API: https://api.powermental.fit
