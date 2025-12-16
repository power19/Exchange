# VPS Firebase Setup Instructions

Follow these steps to configure Firebase push notifications on your VPS.

## Important: Docker Image Rebuild Required

Your VPS uses a pre-built Docker image (`power1984/powermental-app:latest`). To enable Firebase push notifications, you need to:
1. Build a new Docker image with Firebase support
2. Push it to Docker Hub
3. Pull and restart on VPS

## Step 1: Upload firebase-service-account.json to VPS

From your PC (where you have the firebase-service-account.json file):

```bash
# Upload the file to VPS usdt-exchange directory
scp firebase-service-account.json admin@powermental.fit:~/usdt-exchange/
```

**Expected output:**
```
firebase-service-account.json    100%  2341    45.2KB/s   00:00
```

## Step 2: Upload Updated docker-compose.production.yml to VPS

From your Exchange directory on PC:

```bash
# Upload the updated production compose file
scp docker-compose.production.yml admin@powermental.fit:~/usdt-exchange/
```

## Step 3: Build and Push New Docker Image (From Your PC)

**IMPORTANT:** Since you're using a Docker image, you need to rebuild with Firebase support:

```bash
# On your PC, navigate to Exchange directory
cd C:\Users\brian\Exchange

# Pull latest changes
git pull

# Login to Docker Hub (if not already logged in)
docker login

# Build new backend image with Firebase support
cd backend
docker build -t power1984/powermental-app:latest .

# Push to Docker Hub
docker push power1984/powermental-app:latest

# Go back to root
cd ..
```

## Step 4: Verify Files on VPS

SSH into your VPS and check files are in place:

```bash
ssh admin@powermental.fit
cd ~/usdt-exchange

# Check docker-compose.production.yml has Firebase config
grep -A 2 "GOOGLE_APPLICATION_CREDENTIALS" docker-compose.production.yml

# Check firebase-service-account.json exists
ls -lh firebase-service-account.json
```

**Expected output:**
```
      GOOGLE_APPLICATION_CREDENTIALS: /app/firebase-service-account.json
    volumes:
      - ./firebase-service-account.json:/app/firebase-service-account.json:ro

-rw-r--r-- 1 admin admin 2.3K Dec 16 firebase-service-account.json
```

## Step 5: Pull New Image and Restart Backend Container

```bash
cd ~/usdt-exchange

# Pull the new image with Firebase support
docker compose -f docker-compose.production.yml pull backend

# Restart backend with new image
docker compose -f docker-compose.production.yml up -d backend

# Wait a few seconds for startup
sleep 10

# Check backend logs for Firebase initialization
docker compose -f docker-compose.production.yml logs backend | grep -i firebase
```

**Expected output (success):**
```
✅ Firebase Admin SDK initialized
```

**If you see errors:**
- "ENOENT: no such file" → File path is wrong, check Step 1
- "Invalid service account" → Wrong JSON file, re-download from Firebase Console
- "Permission denied" → Run `chmod 644 backend/firebase-service-account.json`

## Step 6: Verify Backend is Running

```bash
# Check all containers are running
docker compose -f docker-compose.production.yml ps

# Test backend health endpoint
curl https://api.powermental.fit/health

# Check recent backend logs
docker compose -f docker-compose.production.yml logs backend --tail=50
```

**Expected output:**
```
STATUS
db        running
backend   running
frontend  running

{"status":"ok","timestamp":"2024-01-15T..."}
```

## Step 7: Test Device Token Registration

From your Android phone, open Brian's app. Check backend logs:

```bash
docker compose -f docker-compose.production.yml logs -f backend
```

**Expected output when app opens:**
```
📱 Device token: eA7Gx...
✅ Device token registered for brian
```

## Troubleshooting

### Problem: "Cannot find module firebase-admin"

**Solution:** Rebuild the Docker image with firebase-admin installed (see Step 3)

### Problem: "GOOGLE_APPLICATION_CREDENTIALS not set"

**Solution:** Check docker-compose.production.yml has the environment variable under `backend:` service

### Problem: "Invalid service account JSON"

**Solution:**
1. Re-download from Firebase Console → Settings → Service accounts → Generate new private key
2. Re-upload to VPS
3. Restart backend

### Problem: Backend won't start after changes

**Solution:**
```bash
# Check detailed logs
docker compose -f docker-compose.production.yml logs backend

# Verify file permissions
chmod 644 firebase-service-account.json

# Pull latest image and restart
docker compose -f docker-compose.production.yml pull backend
docker compose -f docker-compose.production.yml up -d backend
```

## Next Steps

Once Firebase is working on the backend:

1. ✅ Backend push notification service is ready
2. ⬜ Add google-services.json to Android projects
3. ⬜ Build updated Android apps with push notification support
4. ⬜ Test notifications end-to-end

See `PUSH_NOTIFICATIONS_SETUP.md` for complete setup guide.
