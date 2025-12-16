# Push Notifications Setup Guide

## Overview

I've implemented **Firebase Cloud Messaging (FCM)** push notifications to replace the polling system. This is much better because:

✅ **Instant notifications** - no 15-second delay
✅ **No battery drain** - no background polling
✅ **Works when app is closed** - notifications arrive even if app isn't running
✅ **No Xiaomi issues** - push notifications bypass battery optimization

## What Changed

### Backend (Already Done ✅)
- Installed `firebase-admin` package
- Created `device_tokens` table in database
- Created `PushNotificationService` with all notification methods
- Integrated push notifications into all routes:
  - VES orders (create & fulfill)
  - COP orders (create & fulfill)
  - USDT transfers
  - USDT requests (create, approve, reject)
- Created API endpoints for device token registration

### Frontend (You Need to Do)
- Install `@capacitor/push-notifications`
- Register device tokens on app start
- Handle incoming push notifications

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enter project name: `usdt-exchange` (or any name you want)
4. Disable Google Analytics (not needed)
5. Click "Create project"

## Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon (⚙️ Settings → Project settings)
2. Click "Add app" → Select "Android"
3. **Android package name**: `com.usdt.brian` (for Brian's app)
4. **App nickname**: `Brian USDT`
5. Click "Register app"
6. **Download `google-services.json`**
7. Repeat for the other two apps:
   - Package: `com.usdt.dairimar`, Nickname: `Dairimar USDT`
   - Package: `com.usdt.patty`, Nickname: `Patty USDT`

## Step 3: Configure Backend

### 3.1: Get Firebase Service Account Key

1. In Firebase Console → ⚙️ Settings → Service accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json`
4. Upload it to your VPS:

```bash
# From your PC
scp firebase-service-account.json admin@powermental:~/usdt-exchange/backend/
```

### 3.2: Update Backend Environment

SSH to your VPS and edit `docker-compose.yml`:

```bash
ssh admin@powermental
cd ~/usdt-exchange
nano docker-compose.yml
```

Add this environment variable to the `backend` service:

```yaml
services:
  backend:
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-service-account.json
    volumes:
      - ./backend/firebase-service-account.json:/app/firebase-service-account.json:ro
```

### 3.3: Run Database Migration

```bash
# Run migration to create device_tokens table
docker-compose exec backend npm run migrate

# Or manually:
docker-compose exec db psql -U postgres -d usdt_exchange -f /path/to/schema.sql
```

### 3.4: Restart Backend

```bash
docker-compose restart backend
docker-compose logs -f backend
```

You should see: `✅ Firebase Admin SDK initialized`

---

## Step 4: Configure Frontend

### 4.1: Install Push Notifications Plugin

On your PC:

```bash
cd C:\Users\brian\Exchange\frontend
npm install @capacitor/push-notifications
```

### 4.2: Add google-services.json to Android Projects

Copy the three `google-services.json` files you downloaded to:

```
frontend/android/app/google-services.json
```

**Important**: You'll need to switch between the three files when building each app, OR create separate build flavors.

### 4.3: Update Frontend Code

I'll create the frontend push notification service for you in the next step.

---

## Step 5: Test Push Notifications

### 5.1: Build and Install Apps

```bash
cd C:\Users\brian\Exchange\frontend

# Build all three apps
npm run android:brian
npm run android:dairimar
npm run android:patty
```

### 5.2: Test Notification Flow

**Test 1: USDT Request**
1. Open Dairimar's app on her phone
2. Create a USDT request
3. **Brian's phone should get notification immediately**: "💵 USDT Request from Dairimar"

**Test 2: VES Order**
1. Open Patty's app
2. Create a VES order
3. **Brian's phone gets**: "🆕 New VES Order!"
4. **Dairimar's phone gets**: "🆕 New VES Order!"

**Test 3: Fulfill VES Order**
1. Open Dairimar's app
2. Fulfill the VES order
3. **Brian's phone gets**: "🎉 VES Order Completed!"
4. **Patty's phone gets**: "🎉 VES Order Completed!"

---

## Notification Flow Summary

| Action | Who Gets Notified |
|--------|-------------------|
| Patty creates VES order | Brian + Dairimar |
| Dairimar fulfills VES order | Brian + Patty |
| Patty creates COP order | Brian |
| Brian fulfills COP order | Patty |
| Dairimar requests USDT | Brian |
| Brian approves USDT request | Dairimar |
| Brian rejects USDT request | Dairimar |
| Brian sends USDT transfer | Dairimar |

---

## Troubleshooting

### Backend Issues

**"Firebase not initialized"**
- Check `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Verify `firebase-service-account.json` exists and is readable
- Check Docker volume mapping in `docker-compose.yml`

**"No active devices for role"**
- Device tokens haven't been registered yet
- Check if frontend is calling `/api/device-tokens/register`
- Verify `device_tokens` table exists in database

### Frontend Issues

**"Permission denied"**
- Android 13+ requires runtime permission
- Make sure app requests `POST_NOTIFICATIONS` permission
- Check AndroidManifest.xml has the permission

**"Token registration failed"**
- Check `google-services.json` is in the correct location
- Verify package name matches Firebase project
- Check backend API is reachable

### Testing Issues

**Notifications not arriving**
- Check device has internet connection
- Verify Firebase project is active
- Check backend logs for push notification errors
- Test with Firebase Console "Send test message" first

---

## Next Steps

1. Complete Step 1-3 (Firebase & Backend setup)
2. I'll create the frontend push notification service
3. Build and test the apps
4. Remove the old polling code once push notifications work

---

## Notes

- **No more Xiaomi battery optimization issues!** Push notifications work regardless of battery settings
- **No more 15-second delay!** Notifications arrive instantly
- **Battery friendly!** No background polling draining battery
- **More reliable!** Google's infrastructure handles delivery
