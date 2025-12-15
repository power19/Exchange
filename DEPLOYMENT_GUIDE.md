# Deployment Guide - USDT Exchange System

## Prerequisites

- Docker and Docker Compose installed on VPS
- Access to Docker Hub account (power1984)
- SSH access to VPS (admin@powermental)
- DNS configured for subdomains:
  - main.powermental.fit → VPS IP
  - dai.powermental.fit → VPS IP
  - patty.powermental.fit → VPS IP
  - api.powermental.fit → VPS IP

## Step-by-Step Deployment

### 1. Build and Push Images (On Local Machine)

```bash
cd /path/to/Exchange
./deploy.sh
```

This will:
- Build the backend Docker image
- Build the frontend dist files
- Push backend image to Docker Hub
- Display next steps

### 2. Copy Frontend Files to VPS

```bash
# From your local machine
scp -r frontend/dist/* admin@powermental:~/usdt-exchange/frontend-dist/
```

### 3. Update Docker Compose on VPS

```bash
# SSH to VPS
ssh admin@powermental

# Backup current docker-compose.yml
cd ~/usdt-exchange
cp docker-compose.yml docker-compose.yml.backup

# Download new docker-compose file (or manually update)
# Update CORS_ORIGINS and VIRTUAL_HOST as needed
```

### 4. Deploy New Version

```bash
# On VPS
cd ~/usdt-exchange

# Pull latest backend image
docker pull power1984/powermental-app:latest

# Stop and recreate containers
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. Verify Deployment

Check all dashboards:
- https://main.powermental.fit/ - Brian's dashboard
- https://dai.powermental.fit/ - Dairimar's dashboard
- https://patty.powermental.fit/ - Patty's dashboard
- https://api.powermental.fit/health - API health check

### 6. Database Migrations

The migrations run automatically on backend startup via:
```bash
npm run migrate && npm start
```

This will add:
- `expenses` table
- Any other schema updates

### 7. Verify Database Schema

```bash
# On VPS
docker exec -it usdt-db psql -U postgres -d usdt_exchange -c "\dt"
```

You should see all tables including the new `expenses` table.

## Rollback Procedure

If something goes wrong:

```bash
# On VPS
cd ~/usdt-exchange

# Restore previous docker-compose
cp docker-compose.yml.backup docker-compose.yml

# Use previous backend version
docker-compose down
docker-compose up -d

# Restore database from backup if needed
docker exec -i usdt-db psql -U postgres -d usdt_exchange < ~/backups/usdt_exchange_backup_YYYYMMDD_HHMMSS.sql
```

## Troubleshooting

### Backend not starting
```bash
docker logs usdt-backend
```

### Frontend not loading
```bash
docker logs usdt-frontend
docker logs nginx-proxy
```

### Database connection issues
```bash
docker exec usdt-db pg_isready -U postgres
docker exec usdt-backend env | grep DATABASE
```

### Clear browser cache
The frontend uses client-side routing. If you see issues, clear browser cache or use incognito mode.

## Environment Variables

### Backend (.env or docker-compose.yml)
- `NODE_ENV=production`
- `DATABASE_URL=postgres://postgres:PASSWORD@db:5432/usdt_exchange`
- `JWT_SECRET=<your-secret-key>`
- `CORS_ORIGINS=https://main.powermental.fit,https://dai.powermental.fit,https://patty.powermental.fit`

### Frontend (built into dist files)
- `VITE_API_URL=https://api.powermental.fit/api`

## New Features in This Version

1. **Expenses Tracking** - Track business expenses (Brian only, requires authentication)
2. **Reports Tab** - Separate tab for daily reports and order reports
3. **Notifications** - Mobile app notifications for:
   - Order creation
   - Order fulfillment
   - USDT requests/approvals/rejections
4. **Private Orders** - Brian can create private VES/COP orders
5. **UI Improvements** - Better tab navigation, cleaner dashboards

## Mobile Apps

After deployment, the mobile apps should work with the new API:
- Dairimar USDT - connects to api.powermental.fit
- Patty USDT - connects to api.powermental.fit
- Brian USDT - connects to api.powermental.fit

All configured in `.env.dairimar`, `.env.patty`, `.env.brian`

## Support

If issues persist, check:
1. Docker logs: `docker-compose logs -f`
2. Database connectivity: `docker exec usdt-db pg_isready`
3. API health: `curl https://api.powermental.fit/health`
4. DNS resolution: `nslookup main.powermental.fit`
