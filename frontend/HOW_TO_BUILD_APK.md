# How to Build the Dairimar USDT Android APK

## ✅ Configuration Complete!

Your app is now configured to connect to your backend at:
**`http://10.10.30.100:3000`**

## 🎯 Next Steps: Build the APK

### Option 1: Using Android Studio (RECOMMENDED - Most Reliable)

1. **Open Android Studio**

2. **Open the Android Project**
   - Click: `File > Open`
   - Navigate to: `C:\Users\brian\Documents\Exchange\frontend\android`
   - Click: `OK`

3. **Wait for Gradle Sync**
   - Android Studio will automatically sync Gradle (bottom status bar)
   - This may take 2-5 minutes on first run
   - Wait for "Gradle sync finished" message

4. **Build the APK**
   - Click: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - Wait for the build to complete (2-5 minutes)
   - A notification will appear: "APK(s) generated successfully"

5. **Locate the APK**
   - Click: `locate` in the notification
   - Or navigate to: `frontend\android\app\build\outputs\apk\debug\`
   - File name: `app-debug.apk`

### Option 2: Using PowerShell

1. **Open PowerShell as Administrator**

2. **Navigate to the android folder**
   ```powershell
   cd C:\Users\brian\Documents\Exchange\frontend\android
   ```

3. **Run the build script**
   ```powershell
   .\build-apk.ps1
   ```

4. **If you get execution policy error, run:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Then try the build script again.

5. **Or build directly:**
   ```powershell
   .\gradlew.bat assembleDebug
   ```

### Option 3: Using Command Prompt

1. **Open Command Prompt**

2. **Navigate to the android folder**
   ```cmd
   cd C:\Users\brian\Documents\Exchange\frontend\android
   ```

3. **Run the build command**
   ```cmd
   gradlew.bat assembleDebug
   ```

4. **Wait for build to complete** (2-10 minutes first time)

5. **Find your APK at:**
   ```
   app\build\outputs\apk\debug\app-debug.apk
   ```

## 📱 Installing the APK on Your Phone

### Prerequisites:
1. **Enable Developer Options** on your Android phone:
   - Go to: `Settings > About Phone`
   - Tap `Build Number` **7 times**
   - You'll see "You are now a developer!"

2. **Enable USB Debugging**:
   - Go to: `Settings > System > Developer Options`
   - Toggle on: `USB Debugging`

### Installation Methods:

#### Method A: Via USB Cable
1. Connect your phone to computer via USB
2. Copy `app-debug.apk` to your phone
3. On your phone, open `My Files` or `File Manager`
4. Navigate to where you copied the APK
5. Tap the APK file
6. Tap `Install`
7. Allow "Install from Unknown Sources" if prompted

#### Method B: Via ADB (if Android Studio installed)
1. Connect phone via USB
2. Open Command Prompt in the android folder
3. Run:
   ```cmd
   adb install app\build\outputs\apk\debug\app-debug.apk
   ```

#### Method C: Via Cloud/Email
1. Upload APK to Google Drive, Dropbox, or email it to yourself
2. On your phone, download the APK
3. Open the downloaded file
4. Tap `Install`

## 🔧 Before Testing the App

### 1. Make Sure Backend is Running
```cmd
cd C:\Users\brian\Documents\Exchange
docker-compose ps
```
All containers should show "Up"

If not running, start it:
```cmd
docker-compose up -d
```

### 2. Make Sure Phone is on Same Network
- Your phone must be connected to the same network as your computer
- Your computer's IP is: **10.10.30.100**
- Both should be on the same WiFi/network

### 3. Test Backend Connection from Phone
- On your phone, open a browser
- Navigate to: `http://10.10.30.100:3000/health`
- You should see: `{"status":"ok"}`
- If this doesn't work, the app won't work either

## 🧪 Testing the App

1. **Open the "Dairimar USDT" app** on your phone

2. **You should see:**
   - Dairimar's USDT Balance
   - Dairimar's VES Balance
   - Pending VES Orders (if any)
   - Convert USDT to VES form
   - Request USDT form

3. **Test Features:**
   - ✅ View balances
   - ✅ Convert USDT to VES
   - ✅ View pending orders
   - ✅ Fulfill VES orders

## ❌ Troubleshooting

### Build Errors

**"Android SDK not found"**
- Install Android Studio
- Open Android Studio and install SDK via SDK Manager

**"JAVA_HOME not set"**
- Install Java JDK 17 (comes with Android Studio)
- Or set manually:
  ```cmd
  set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
  ```

**"Gradle sync failed"**
- Open the project in Android Studio
- Let it sync automatically
- Click "Sync Project with Gradle Files" if needed

### Connection Errors

**"Network Error" or "Unable to connect"**

Check these:
1. ✅ Backend is running: `docker-compose ps`
2. ✅ Phone and computer on same WiFi
3. ✅ Can access from phone browser: `http://10.10.30.100:3000/health`
4. ✅ No firewall blocking port 3000

**Fix Windows Firewall:**
```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "USDT Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**"Cannot install APK"**
- Enable "Install from Unknown Sources" in phone settings
- Try installing via Android Studio ADB

### App Crashes or Blank Screen

1. Check Android Studio Logcat for errors
2. Ensure backend is running
3. Verify API URL is correct
4. Try clearing app data and reopening

## 📦 APK Details

- **App Name**: Dairimar USDT
- **Package**: com.usdt.dairimar
- **Backend**: http://10.10.30.100:3000/api
- **APK Type**: Debug (for testing)
- **Minimum Android**: 7.0 (API 24)

## 🎉 Success!

Once the app is working:
- Dairimar can use this app instead of web browser
- All features work exactly like the web version
- Data syncs with web dashboard in real-time

## 📝 Notes

- This is a **debug APK** for testing
- For production (Google Play Store), you'll need to create a **signed release APK**
- The app size is approximately **5-10 MB**
- First build takes longer (downloads dependencies)
- Subsequent builds are much faster

## Need More Help?

See the full documentation:
- `MOBILE_APP_README.md` - Complete guide
- `BUILD_INSTRUCTIONS.txt` - Quick reference

---

**Current Configuration:**
- ✅ Backend IP: 10.10.30.100
- ✅ Backend Port: 3000
- ✅ App configured for Dairimar dashboard
- ✅ Network permissions enabled
- ✅ Ready to build!
