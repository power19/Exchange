# Quick Reference - Production Commands

## SSH into VPS

```bash
ssh root@your-vps-ip
cd /opt/usdt-exchange
```

## Service Management

### Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Restart Single Service
```bash
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
```

## Monitoring

### View All Logs (Live)
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### View Specific Service Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f db
docker-compose -f docker-compose.prod.yml logs -f letsencrypt
```

### Check Container Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Check Resource Usage
```bash
docker stats
```

## Updates / Redeployment

### Update Code and Redeploy
```bash
cd /opt/usdt-exchange

# If using Git
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Update Single Service (Zero Downtime)
```bash
docker-compose -f docker-compose.prod.yml up -d --build --no-deps backend
docker-compose -f docker-compose.prod.yml up -d --build --no-deps frontend
```

## Database Management

### Backup Database
```bash
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres usdt_exchange > backup-$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup-20250101.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres usdt_exchange
```

### Connect to Database
```bash
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d usdt_exchange
```

### Run Database Query
```bash
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d usdt_exchange -c "SELECT * FROM ves_orders WHERE status = 'PENDING';"
```

## SSL Certificates

### Check SSL Status
```bash
docker-compose -f docker-compose.prod.yml logs letsencrypt
```

### Force SSL Renewal
```bash
docker-compose -f docker-compose.prod.yml restart letsencrypt
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs for errors
docker-compose -f docker-compose.prod.yml logs backend

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Try rebuilding
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Database Connection Issues
```bash
# Check if database is healthy
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# Restart database
docker-compose -f docker-compose.prod.yml restart db
```

### Clear and Rebuild Everything
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

⚠️ **Warning**: `-v` flag removes volumes (database data will be lost!)

## System Maintenance

### Clean Up Docker
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (be careful!)
docker volume prune

# Clean everything
docker system prune -a
```

### Check Disk Space
```bash
df -h
du -sh /var/lib/docker
```

### View System Logs
```bash
journalctl -u docker -f
```

## Quick Health Check

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Test API
curl https://powermental.vps.xxxx/api/balances

# Test each subdomain
curl -I https://powermental.vps.xxxx
curl -I https://pato.vps.xxxx
curl -I https://dai.vps.xxxx
```

## Emergency Commands

### Stop Everything Immediately
```bash
docker stop $(docker ps -q)
```

### Restart Docker Service
```bash
sudo systemctl restart docker
```

### View Docker Service Status
```bash
sudo systemctl status docker
```

## Common Issues

### Port Already in Use
```bash
# Find what's using port 80
sudo lsof -i :80

# Kill process
sudo kill -9 PID
```

### Out of Disk Space
```bash
# Check space
df -h

# Clean Docker
docker system prune -a --volumes

# Remove old logs
sudo journalctl --vacuum-time=7d
```

### SSL Not Working
```bash
# Check if ports are open
sudo ufw status

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Restart nginx-proxy and letsencrypt
docker-compose -f docker-compose.prod.yml restart nginx-proxy letsencrypt
```
