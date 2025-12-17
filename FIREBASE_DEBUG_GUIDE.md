# Firebase Push Notifications Debugging Guide

## Pre-Flight Checklist

### 1. Required Files
- [ ] `frontend/android/app/google-services.json` exists
- [ ] `firebase-service-account.json` exists in project root
- [ ] `@capacitor/push-notifications` installed

### 2. Android Studio Debug Setup

#### Step 1: Open Project in Android Studio
```bash
cd /home/user/Exchange/frontend
npx cap open android
```

#### Step 2: Check Logcat Filters
In Android Studio, open **Logcat** (bottom panel) and set these filters:

**Filter 1 - Firebase Registration:**
```
Tag: FirebaseMessaging
Level: Verbose
```

**Filter 2 - FCM Token:**
```
Tag: PushNotification
Level: Debug
```

**Filter 3 - App Logs:**
```
Tag: Capacitor/Console
Level: Verbose
```

**Filter 4 - All Firebase:**
```
Package: com.google.firebase
Level: Debug
```

#### Step 3: Run App with Debugger
1. Connect your Android device via USB or start emulator
2. Click **Run** → **Debug 'app'** (Shift+F9)
3. Watch Logcat for these key messages:

**✅ Success indicators:**
```
FirebaseMessaging: Token retrieved successfully
Capacitor/Console: ✅ Push notification permission granted
Capacitor/Console: 📱 Device token: [TOKEN_HERE]
Capacitor/Console: ✅ Device token registered with backend
```

**❌ Error indicators:**
```
FirebaseApp: Default FirebaseApp failed to initialize
FirebaseMessaging: Token retrieval failed
google-services.json not found
```

### 3. Test Token Generation

#### Check if FCM Token is Generated
Add this breakpoint in `MainActivity.java` or use Logcat:

```
Search for: "FirebaseInstanceId"
OR
Search for: "FCM Token"
```

#### Manual Token Retrieval Test
In Logcat, filter by your app package and look for:
```
I/FirebaseMessaging: Token: [YOUR_TOKEN_HERE]
```

### 4. Test Notification Receipt

#### Option A: Using Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Engage → Messaging**
4. Click **Create your first campaign** → **Firebase Notification messages**
5. Fill in:
   - **Notification title**: Test Notification
   - **Notification text**: Testing push notifications
6. Click **Next**
7. Under **Target**, select your app
8. Click **Review** → **Publish**

Watch Logcat for:
```
FirebaseMessaging: Notification received
Capacitor/Console: 📩 Push notification received
```

#### Option B: Using Backend API Test
```bash
# First, get a device token from Logcat
# Then test backend sending:

curl -X POST http://YOUR_BACKEND:3000/api/test-push \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_FCM_TOKEN_FROM_LOGCAT",
    "title": "Test",
    "body": "Testing notifications"
  }'
```

### 5. Common Issues & Solutions

#### Issue 1: "google-services.json not found"
**Solution:**
```bash
# Verify file exists
ls -la /home/user/Exchange/frontend/android/app/google-services.json

# If missing, download from Firebase Console:
# 1. Go to Project Settings → General
# 2. Scroll to "Your apps" → Android app
# 3. Click "google-services.json" download button
# 4. Place in frontend/android/app/
```

#### Issue 2: "Default FirebaseApp failed to initialize"
**Causes:**
- Invalid or missing google-services.json
- Incorrect package name in google-services.json
- Build cache issues

**Solution:**
```bash
cd frontend/android
./gradlew clean
cd ..
npx cap sync android
```

#### Issue 3: No token generated
**Check in Logcat:**
```
Search: "TokenRefresh"
```

**Force token refresh** (add to MainActivity.java):
```java
import com.google.firebase.messaging.FirebaseMessaging;

// In onCreate():
FirebaseMessaging.getInstance().getToken()
    .addOnCompleteListener(task -> {
        if (task.isSuccessful()) {
            String token = task.getResult();
            Log.d("FCM_TOKEN", "Token: " + token);
        }
    });
```

#### Issue 4: Token generated but notifications not received
**Test notification delivery:**
1. Copy FCM token from Logcat
2. Use Firebase Console to send test message
3. If received → Backend issue
4. If NOT received → Android configuration issue

**Check AndroidManifest.xml** for:
```xml
<service
    android:name="com.google.firebase.messaging.FirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

### 6. Verify Backend Configuration

#### Check if backend initialized Firebase:
```bash
docker-compose logs backend | grep -i firebase
```

**Expected output:**
```
✅ Firebase Admin SDK initialized
```

**If you see:**
```
⚠️ GOOGLE_APPLICATION_CREDENTIALS not set
```

**Solution:**
```bash
# 1. Verify firebase-service-account.json exists
ls -la /home/user/Exchange/firebase-service-account.json

# 2. Restart backend
docker-compose restart backend
```

### 7. End-to-End Test Workflow

#### Step 1: Build and Install App
```bash
cd frontend
npm run sync:dairimar  # or sync:patty or sync:brian
cd android
./gradlew installDairimarDebug  # matches your build flavor
```

#### Step 2: Launch with Logcat
1. Open Android Studio
2. Run → Debug 'app'
3. Open Logcat
4. Filter: Package name (com.usdt.dairimar)

#### Step 3: Watch for Token Registration
Look for these logs in order:
```
1. "Capacitor: Initializing"
2. "PushNotificationService: initialize called"
3. "✅ Push notification permission granted for dairimar"
4. "FirebaseMessaging: Token retrieved"
5. "📱 Device token: [TOKEN]"
6. "✅ Device token registered with backend"
```

#### Step 4: Trigger a Real Notification
Submit a VES order from Patty's app → Watch Dairimar's device

#### Step 5: Verify in Database
```bash
docker-compose exec db psql -U postgres -d usdt_exchange -c \
  "SELECT user_role, device_token, is_active, created_at FROM device_tokens;"
```

### 8. Advanced Debugging

#### Enable Firebase Debug Logging
Add to `AndroidManifest.xml`:
```xml
<meta-data
    android:name="firebase_messaging_auto_init_enabled"
    android:value="true" />
<meta-data
    android:name="firebase_analytics_collection_enabled"
    android:value="false" />
```

Restart app and check Logcat with filter:
```
Tag: FA
Level: Verbose
```

#### Test with ADB Logcat (No Android Studio)
```bash
# Connect device
adb devices

# Watch all logs
adb logcat | grep -E "Firebase|FCM|PushNotification|Capacitor"

# Or specific tags
adb logcat -s FirebaseMessaging:V PushNotificationService:V
```

#### Manual Notification Test via ADB
```bash
# If you have the FCM token, test via curl:
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Test",
      "body": "Testing from curl"
    }
  }'
```

## Quick Reference: Logcat Commands

```bash
# View all Firebase-related logs
adb logcat | grep Firebase

# View only errors
adb logcat *:E

# Clear logcat
adb logcat -c

# Save logs to file
adb logcat > firebase-debug.log

# Filter by your app package
adb logcat --pid=$(adb shell pidof -s com.usdt.dairimar)
```

## Checklist Summary

Before installing on phone, verify in Android Studio:
- [  ] ✅ FCM token generated (visible in Logcat)
- [ ] ✅ Token registered with backend (200 response)
- [ ] ✅ Test notification from Firebase Console received
- [ ] ✅ No errors in Logcat during app startup
- [ ] ✅ `device_tokens` table has entry in database
- [ ] ✅ Backend logs show Firebase initialized

Once all ✅ above → Safe to install on phone
