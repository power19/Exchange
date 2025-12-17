# Android Studio Testing Guide for Firebase Push Notifications

## Quick Setup (Before Testing)

### 1. Download Required Files

#### A. Download google-services.json
```
1. Go to https://console.firebase.google.com
2. Select your project
3. Click ⚙️ (Settings) → Project settings
4. Scroll to "Your apps" section
5. Find your Android app (or add one if not exists):
   - Package name: com.usdt.dairimar (or com.usdt.patty or com.usdt.brian)
   - App nickname: Dairimar USDT (or Patty USDT or Brian USDT)
6. Click "google-services.json" download button
7. Save to: /home/user/Exchange/frontend/android/app/google-services.json
```

#### B. Download firebase-service-account.json
```
1. Go to https://console.firebase.google.com
2. Select your project
3. Click ⚙️ → Project settings → Service accounts tab
4. Click "Generate new private key" button
5. Confirm and download
6. Save as: /home/user/Exchange/firebase-service-account.json
```

### 2. Install Dependencies & Sync

```bash
cd /home/user/Exchange/frontend

# Install dependencies
npm install

# Sync Capacitor for Dairimar build
npm run sync:dairimar

# Or for other builds:
# npm run sync:patty
# npm run sync:brian
```

### 3. Verify Setup

```bash
cd /home/user/Exchange
./verify-firebase-setup.sh
```

You should see:
```
✅ All checks passed! Firebase is properly configured.
```

---

## Testing in Android Studio

### Option 1: Using Android Emulator

#### Step 1: Open Project
```bash
cd /home/user/Exchange/frontend
npx cap open android
```

#### Step 2: Create/Start Emulator
1. In Android Studio, click **Device Manager** (phone icon on right sidebar)
2. Create new device if needed:
   - Click **Create Device**
   - Select **Pixel 6** or similar
   - Select **System Image**: Android 13 (API 33) or higher with Google Play
   - ⚠️ **IMPORTANT**: Must include Google Play for FCM to work
   - Click **Finish**
3. Click ▶️ to start emulator

#### Step 3: Run App with Logcat
1. Select build variant:
   - Go to **Build** → **Select Build Variant**
   - Choose: `dairimarDebug` (or `pattyDebug` or `brianDebug`)
2. Click **Run** → **Debug 'app'** (Shift+F9)
3. App will install and launch on emulator

#### Step 4: Open Logcat
1. Click **Logcat** tab at bottom of Android Studio
2. Set filter to your app package: `com.usdt.dairimar`
3. Watch for these messages:

**✅ SUCCESS - You should see:**
```
I/Capacitor: Starting BridgeActivity
I/PushNotifications: Initializing push notifications
D/FirebaseMessaging: Token retrieval successful
I/System.out: 📱 Device token: [LONG_TOKEN_STRING]
I/System.out: ✅ Device token registered with backend
```

**❌ ERRORS - If you see:**
```
E/FirebaseApp: Default FirebaseApp failed to initialize
  → Missing or invalid google-services.json

E/FirebaseMessaging: Token retrieval failed
  → Firebase not configured properly

E/Capacitor: Plugin not found: PushNotifications
  → @capacitor/push-notifications not installed
```

### Option 2: Using Physical Android Device (Recommended)

#### Step 1: Enable Developer Mode
1. On your phone: **Settings** → **About phone**
2. Tap **Build number** 7 times
3. Developer mode enabled!

#### Step 2: Enable USB Debugging
1. **Settings** → **System** → **Developer options**
2. Enable **USB debugging**

#### Step 3: Connect Device
```bash
# Connect phone via USB cable

# Verify connection
adb devices

# You should see:
# List of devices attached
# ABC123XYZ    device
```

#### Step 4: Run on Device
1. In Android Studio, select your device from dropdown (top bar)
2. Click **Run** → **Debug 'app'** (Shift+F9)
3. App will install on your phone

#### Step 5: Monitor via Logcat
Two options:

**Option A: Android Studio Logcat**
1. Click **Logcat** tab
2. Device should auto-select
3. Filter by package: `com.usdt.dairimar`

**Option B: Terminal ADB Logcat**
```bash
# Watch all relevant logs
adb logcat | grep -E "Firebase|FCM|PushNotification|Capacitor"

# Or specific tags only
adb logcat -s FirebaseMessaging:V Capacitor:V PushNotifications:V

# Save to file for later review
adb logcat -s FirebaseMessaging:V > firebase-debug.log
```

---

## Testing Push Notifications

### Test 1: Verify Token Registration

#### In Logcat, look for:
```
📱 Device token: eyJhbGciOiJSUzI1NiIsImtp...  (this is your FCM token)
✅ Device token registered with backend
```

#### Verify in Database:
```bash
# Check if token was saved
docker-compose exec db psql -U postgres -d usdt_exchange -c \
  "SELECT user_role, LEFT(device_token, 50) as token, is_active, created_at FROM device_tokens ORDER BY created_at DESC LIMIT 5;"
```

Expected output:
```
 user_role |                       token                        | is_active |       created_at
-----------+----------------------------------------------------+-----------+------------------------
 dairimar  | eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ...      | t         | 2025-12-17 12:34:56
```

### Test 2: Send Test Notification from Firebase Console

#### Step-by-Step:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Engage** → **Messaging** (left sidebar)
4. Click **Create your first campaign** → **Firebase Notification messages**
5. Fill in:
   - **Notification title**: Test Notification
   - **Notification text**: Testing Firebase push notifications
   - (Optional) **Notification image**: leave blank
6. Click **Next**
7. Under **Target**:
   - Select **User segment** → **All users**
   - OR select your specific app: `com.usdt.dairimar`
8. Click **Next**
9. **Scheduling**: Select **Now**
10. Click **Next**
11. **Conversion events**: Skip
12. Click **Next**
13. **Additional options**:
    - Notification channel: `usdt_exchange` (optional)
14. Click **Review**
15. Click **Publish**

#### Watch for notification:
- **If app is in foreground**: Check Logcat for:
  ```
  📩 Push notification received: {title: "Test Notification", body: "Testing..."}
  ```

- **If app is in background/closed**: Notification should appear in notification tray

### Test 3: Send from Backend API

#### Create a test endpoint (for debugging):
```bash
# In backend, create test route:
curl -X POST http://localhost:3000/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{
    "role": "dairimar",
    "title": "Backend Test",
    "body": "Testing notification from backend"
  }'
```

#### Backend test endpoint (add to routes if needed):
```typescript
// backend/src/routes/index.ts
router.post('/test-notification', async (req, res) => {
  const { role, title, body } = req.body;

  await PushNotificationService.sendToRole(role, {
    title,
    body,
    data: { type: 'test' }
  });

  res.json({ success: true, message: 'Test notification sent' });
});
```

### Test 4: Trigger Real Notification

#### Submit an order and verify notification:
1. Open Patty's app (or use browser)
2. Submit a new VES order
3. Watch Dairimar's device for notification

**Expected:**
- Notification appears: "🆕 New VES Order! Customer: XXX VES"
- Tap notification → App opens
- Logcat shows: `👆 Notification tapped`

---

## Debugging Common Issues

### Issue 1: No Token Generated

**Symptom:** No "Device token: ..." message in Logcat

**Debug steps:**
```
1. Check Logcat for Firebase initialization:
   Filter: FirebaseApp
   Look for: "Initialized FirebaseApp"

2. If not found, check google-services.json:
   - Verify file exists: frontend/android/app/google-services.json
   - Verify valid JSON: cat frontend/android/app/google-services.json | jq .
   - Verify package name matches: com.usdt.dairimar

3. Clean and rebuild:
   cd frontend/android
   ./gradlew clean
   cd ..
   npx cap sync android
   # Reopen in Android Studio and run
```

### Issue 2: Token Generated but Not Registered

**Symptom:** See "Device token: ..." but no "registered with backend"

**Debug steps:**
```bash
# 1. Check backend is running
docker-compose ps backend

# 2. Check backend logs
docker-compose logs backend | grep -i firebase

# Expected: "✅ Firebase Admin SDK initialized"

# 3. Test backend endpoint manually
curl -X POST http://localhost:3000/api/device-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "user_role": "dairimar",
    "device_token": "test123",
    "device_id": "test-device",
    "platform": "android"
  }'

# Should return: {"success": true}
```

### Issue 3: Notification Not Received

**Symptom:** Token registered, Firebase Console shows "sent", but no notification

**Debug steps:**
```
1. Check app is properly registered for FCM:
   Logcat filter: FirebaseMessaging
   Look for: "Token retrieval successful"

2. Check notification channel:
   Settings → Apps → [Your App] → Notifications
   Verify: Notifications are enabled

3. Test with high priority:
   In Firebase Console → Additional options
   Set: Android notification priority = High

4. Check Firebase Console delivery report:
   Navigate to sent campaign
   Check: Impressions and Opens metrics
```

### Issue 4: "Invalid token" or "Token not registered"

**Symptom:** Backend logs show token errors

**Solution:**
```bash
# Check database for invalid tokens
docker-compose exec db psql -U postgres -d usdt_exchange -c \
  "SELECT user_role, is_active, updated_at FROM device_tokens WHERE is_active = false;"

# Backend automatically marks invalid tokens as inactive
# User needs to reinstall app or clear app data to re-register
```

---

## Logcat Cheat Sheet

### Essential Filters

```bash
# All Firebase and app logs
adb logcat -s FirebaseMessaging:V Capacitor:V System.out:I

# Only FCM tokens
adb logcat | grep "Device token"

# Only push notifications
adb logcat | grep "Push notification"

# Clear logcat
adb logcat -c

# Save to file
adb logcat > app-debug.log

# Watch specific package only
adb logcat --pid=$(adb shell pidof -s com.usdt.dairimar)
```

### Key Log Messages to Look For

| Message | Meaning |
|---------|---------|
| `Initialized FirebaseApp` | ✅ Firebase SDK initialized |
| `Token retrieval successful` | ✅ FCM token obtained |
| `Device token: eyJ...` | ✅ Token generated |
| `registered with backend` | ✅ Backend received token |
| `Push notification received` | ✅ Notification received |
| `Notification tapped` | ✅ User interacted with notification |
| `FirebaseApp failed to initialize` | ❌ google-services.json issue |
| `Token retrieval failed` | ❌ FCM configuration issue |
| `Plugin not found: PushNotifications` | ❌ Package not installed |

---

## Production Testing Checklist

Before deploying to production, verify:

- [ ] ✅ App receives notifications when in foreground
- [ ] ✅ App receives notifications when in background
- [ ] ✅ App receives notifications when closed
- [ ] ✅ Tapping notification opens app
- [ ] ✅ Multiple devices can register (test with 2+ devices)
- [ ] ✅ Notifications work after app restart
- [ ] ✅ Notifications work after device restart
- [ ] ✅ Backend logs show successful delivery
- [ ] ✅ Database shows active tokens
- [ ] ✅ Real workflow triggers notification (e.g., new order)

---

## Additional Resources

- [Firebase Console](https://console.firebase.google.com)
- [Capacitor Push Notifications Docs](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging/android/client)
- [Android Logcat Docs](https://developer.android.com/studio/debug/logcat)

---

## Quick Commands Reference

```bash
# Setup
npm install
npm run sync:dairimar
npx cap open android

# Testing
adb devices
adb logcat | grep -E "Firebase|FCM|Push"
adb logcat -c  # clear

# Database check
docker-compose exec db psql -U postgres -d usdt_exchange -c \
  "SELECT * FROM device_tokens ORDER BY created_at DESC LIMIT 5;"

# Backend logs
docker-compose logs backend | grep -i firebase

# Verify setup
./verify-firebase-setup.sh
```
