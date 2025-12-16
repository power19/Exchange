# VPS Firebase Setup Instructions

Follow these steps to configure Firebase push notifications on your VPS.

## Step 1: Upload firebase-service-account.json to VPS

From your PC (where you have the firebase-service-account.json file):

```bash
# Upload the file to VPS backend directory
scp firebase-service-account.json admin@powermental.fit:~/usdt-exchange/backend/
```

**Expected output:**
```
firebase-service-account.json    100%  2341    45.2KB/s   00:00
```

## Step 2: Upload Updated docker-compose.yml to VPS

From your Exchange directory on PC:

```bash
# Upload the updated docker-compose.yml
scp docker-compose.yml admin@powermental.fit:~/usdt-exchange/
```

## Step 3: Verify Files on VPS

SSH into your VPS and check files are in place:

```bash
ssh admin@powermental.fit
cd ~/usdt-exchange

# Check docker-compose.yml has Firebase config
grep -A 2 "GOOGLE_APPLICATION_CREDENTIALS" docker-compose.yml

# Check firebase-service-account.json exists
ls -lh backend/firebase-service-account.json
```

**Expected output:**
```
      GOOGLE_APPLICATION_CREDENTIALS: /app/firebase-service-account.json
    volumes:
      - ./backend/firebase-service-account.json:/app/firebase-service-account.json:ro

-rw-r--r-- 1 admin admin 2.3K Dec 16 firebase-service-account.json
```

## Step 4: Restart Backend Container

```bash
cd ~/usdt-exchange

# Rebuild and restart backend only
docker-compose up -d --build backend

# Wait a few seconds for startup
sleep 5

# Check backend logs for Firebase initialization
docker-compose logs backend | grep -i firebase
```

**Expected output (success):**
```
✅ Firebase Admin SDK initialized
```

**If you see errors:**
- "ENOENT: no such file" → File path is wrong, check Step 1
- "Invalid service account" → Wrong JSON file, re-download from Firebase Console
- "Permission denied" → Run `chmod 644 backend/firebase-service-account.json`

## Step 5: Verify Backend is Running

```bash
# Check all containers are running
docker-compose ps

# Test backend health endpoint
curl http://localhost:3000/health

# Check recent backend logs
docker-compose logs -f backend --tail=50
```

**Expected output:**
```
STATUS
db        running
backend   running
frontend  running

{"status":"ok","timestamp":"2024-01-15T..."}
```

## Step 6: Test Device Token Registration

From your Android phone, open Brian's app. Check backend logs:

```bash
docker-compose logs -f backend
```

**Expected output when app opens:**
```
📱 Device token: eA7Gx...
✅ Device token registered for brian
```

## Troubleshooting

### Problem: "Cannot find module firebase-admin"

**Solution:**
```bash
cd ~/usdt-exchange
docker-compose exec backend npm install firebase-admin
docker-compose restart backend
```

### Problem: "GOOGLE_APPLICATION_CREDENTIALS not set"

**Solution:** Check docker-compose.yml has the environment variable under `backend:` service (not under `db:`)

### Problem: "Invalid service account JSON"

**Solution:**
1. Re-download from Firebase Console → Settings → Service accounts → Generate new private key
2. Re-upload to VPS
3. Restart backend

### Problem: Backend won't start after changes

**Solution:**
```bash
# Check detailed logs
docker-compose logs backend

# If needed, rebuild from scratch
docker-compose down
docker-compose up -d --build
```

## Next Steps

Once Firebase is working on the backend:

1. ✅ Backend push notification service is ready
2. ⬜ Add google-services.json to Android projects
3. ⬜ Build updated Android apps with push notification support
4. ⬜ Test notifications end-to-end

See `PUSH_NOTIFICATIONS_SETUP.md` for complete setup guide.
