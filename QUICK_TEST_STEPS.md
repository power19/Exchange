# Quick Test Steps - Firebase Push Notifications

## Before You Start

### Missing Files? Download These First:

**1. google-services.json**
- Download from: Firebase Console → Project Settings → Your Apps → Android
- Save to: `frontend/android/app/google-services.json`

**2. firebase-service-account.json**
- Download from: Firebase Console → Project Settings → Service Accounts → Generate Key
- Save to: `firebase-service-account.json` (project root)

---

## Testing Workflow

### 1️⃣ Install & Sync (5 min)

```bash
cd /home/user/Exchange/frontend

# Install dependencies
npm install

# Build and sync (choose your build)
npm run sync:dairimar  # For Dairimar app
# npm run sync:patty   # For Patty app
# npm run sync:brian   # For Brian app
```

### 2️⃣ Verify Setup (1 min)

```bash
cd /home/user/Exchange
./verify-firebase-setup.sh
```

**Must see:** `✅ All checks passed!`

### 3️⃣ Open in Android Studio (2 min)

```bash
cd /home/user/Exchange/frontend
npx cap open android
```

Wait for Android Studio to open and Gradle sync to finish.

### 4️⃣ Start Backend (if not running)

```bash
cd /home/user/Exchange
docker-compose up -d backend db
```

### 5️⃣ Run App with Logcat

**In Android Studio:**
1. Select device (emulator or physical phone)
2. Select build variant: **Build** → **Select Build Variant** → `dairimarDebug`
3. Click **Run** → **Debug 'app'** (Shift+F9)
4. Open **Logcat** tab (bottom)
5. Filter by package: `com.usdt.dairimar`

### 6️⃣ Watch for Success Messages

**Look for these in Logcat (in order):**

```
✅ Push notification permission granted for dairimar
📱 Device token: eyJhbGciOiJ...
✅ Device token registered with backend
```

**If you see all 3 → SUCCESS! 🎉**

### 7️⃣ Send Test Notification

**Option A: Firebase Console (Easiest)**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Engage** → **Messaging** → **Create campaign**
3. Title: "Test", Body: "Testing notifications"
4. Click **Next** → Select your app → **Publish**
5. **Watch your device/emulator for notification!**

**Option B: Trigger Real Notification**
1. Open Patty's app/dashboard
2. Submit a new VES order
3. Dairimar's device should receive: "🆕 New VES Order!"

---

## Success Checklist

Before installing on your phone, verify in Android Studio:

- [ ] ✅ No errors in Logcat during app startup
- [ ] ✅ "Device token: ..." appears in logs
- [ ] ✅ "registered with backend" appears in logs
- [ ] ✅ Test notification from Firebase Console received
- [ ] ✅ Notification shows in notification tray
- [ ] ✅ Tapping notification opens the app

**If ALL checked → Safe to install APK on phone!**

---

## Quick Debugging

### ❌ No token generated?
```bash
# Clean build and retry
cd frontend/android
./gradlew clean
cd ..
npx cap sync android
# Rerun in Android Studio
```

### ❌ Token not registered with backend?
```bash
# Check backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend | tail -20

# Look for: "✅ Firebase Admin SDK initialized"
```

### ❌ Notification not received?
1. Check Settings → Apps → [Your App] → Notifications = ON
2. Verify token in database:
   ```bash
   docker-compose exec db psql -U postgres -d usdt_exchange -c \
     "SELECT user_role, is_active FROM device_tokens ORDER BY created_at DESC LIMIT 3;"
   ```
3. Try again with app in background (not foreground)

---

## Logcat Quick Commands

```bash
# Watch all Firebase logs
adb logcat | grep -E "Firebase|FCM|Push|Capacitor"

# Clear logcat
adb logcat -c

# Save logs to file
adb logcat > debug.log

# Check device connection
adb devices
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/android/app/google-services.json` | Android app Firebase config |
| `firebase-service-account.json` | Backend Firebase admin credentials |
| `frontend/package.json` | Contains `@capacitor/push-notifications` |
| `frontend/android/app/build.gradle` | Firebase Messaging dependency |

---

## Need More Help?

- **Full debugging guide**: `FIREBASE_DEBUG_GUIDE.md`
- **Android Studio guide**: `ANDROID_STUDIO_TESTING.md`
- **Verify setup**: `./verify-firebase-setup.sh`

---

## Expected Log Output (Success)

```
I/Capacitor: Starting BridgeActivity
I/FirebaseApp: Initialized FirebaseApp
D/FirebaseMessaging: Token retrieval successful
I/System.out: ✅ Push notification permission granted for dairimar
I/System.out: 📱 Device token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdk...
I/System.out: ✅ Device token registered with backend
```

**If you see this → Everything works! 🎉**
