# Android Apps Build Guide

This guide shows you how to build the 3 Android apps: Dairimar, Patty, and Brian.

## ✅ What's Already Configured

Your project is already set up with:
- ✅ 3 separate Capacitor configurations (one for each app)
- ✅ 3 separate environment files with correct API URLs
- ✅ Android product flavors (dairimar, patty, brian)
- ✅ Build scripts in package.json

## 📱 The Three Apps

1. **Dairimar USDT** (`com.usdt.dairimar`)
   - Shows: VES balance, conversions, pending orders
   - API: `https://api.powermental.fit/api`

2. **Patty USDT** (`com.usdt.patty`)
   - Shows: Order submission form, VES balance
   - API: `https://api.powermental.fit/api`

3. **Brian USDT** (`com.usdt.brian`)
   - Shows: Full dashboard with all features
   - API: `https://api.powermental.fit/api`

## 🚀 Quick Build (Easiest Way)

### Build All Three Apps at Once

Open cmd in the `frontend` folder and run:

```cmd
npm run android:dairimar
npm run android:patty
npm run android:brian
```

**That's it!** The APK files will be in:
- Dairimar: `frontend/android/app/build/outputs/apk/dairimar/debug/`
- Patty: `frontend/android/app/build/outputs/apk/patty/debug/`
- Brian: `frontend/android/app/build/outputs/apk/brian/debug/`

## 📝 Step-by-Step Build Instructions

### Prerequisites

1. **Java JDK** (version 17 or higher)
   - Download from: https://www.oracle.com/java/technologies/downloads/
   - Or install via: `winget install Oracle.JDK.17`

2. **Android SDK** (via Android Studio)
   - Download from: https://developer.android.com/studio
   - Or just install Command Line Tools

3. **Set JAVA_HOME environment variable**:
   ```cmd
   set JAVA_HOME=C:\Program Files\Java\jdk-17
   set PATH=%JAVA_HOME%\bin;%PATH%
   ```

### Build Dairimar App

```cmd
cd frontend
npm run android:dairimar
```

This does:
1. Builds the web app with Dairimar configuration
2. Copies the Dairimar Capacitor config
3. Syncs files to Android project
4. Builds the APK using Gradle

**Output:** `frontend/android/app/build/outputs/apk/dairimar/debug/app-dairimar-debug.apk`

### Build Patty App

```cmd
cd frontend
npm run android:patty
```

**Output:** `frontend/android/app/build/outputs/apk/patty/debug/app-patty-debug.apk`

### Build Brian App

```cmd
cd frontend
npm run android:brian
```

**Output:** `frontend/android/app/build/outputs/apk/brian/debug/app-brian-debug.apk`

## 🔧 Manual Build (If Scripts Don't Work)

If the npm scripts don't work, you can build manually:

### Step 1: Build Web App
```cmd
cd frontend
npm run build:dairimar
```

### Step 2: Sync to Android
```cmd
copy capacitor.config.dairimar.ts capacitor.config.ts
npx cap sync android
```

### Step 3: Build APK
```cmd
cd android
gradlew.bat assembleDairimarDebug
```

## 📲 Install APK on Your Phone

### Method 1: USB Cable
1. Enable Developer Mode on your Android phone
2. Enable USB Debugging
3. Connect phone to computer
4. Run:
   ```cmd
   cd android
   gradlew.bat installDairimarDebug
   ```

### Method 2: Manual Install
1. Copy the APK file to your phone
2. Open the APK file on your phone
3. Tap "Install"
4. Allow "Install from Unknown Sources" if prompted

## 🏗️ Build for Production (Release APK)

To build signed release APKs for the Play Store:

### 1. Generate Signing Key

```cmd
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Update Capacitor Config

Edit each `capacitor.config.*.ts` file:

```typescript
android: {
  buildOptions: {
    keystorePath: 'C:/path/to/my-release-key.keystore',
    keystorePassword: 'your-keystore-password',
    keystoreAlias: 'my-key-alias',
    keystoreAliasPassword: 'your-alias-password',
    releaseType: 'APK'
  }
}
```

### 3. Build Release APK

```cmd
cd android
gradlew.bat assembleDairimarRelease
gradlew.bat assemblePattyRelease
gradlew.bat assembleBrianRelease
```

**Outputs:**
- `android/app/build/outputs/apk/dairimar/release/app-dairimar-release.apk`
- `android/app/build/outputs/apk/patty/release/app-patty-release.apk`
- `android/app/build/outputs/apk/brian/release/app-brian-release.apk`

## 🐛 Troubleshooting

### Error: "JAVA_HOME is not set"

**Fix:**
```cmd
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%
```

Make it permanent:
1. Open System Properties → Environment Variables
2. Add `JAVA_HOME` = `C:\Program Files\Java\jdk-17`
3. Add `%JAVA_HOME%\bin` to PATH

### Error: "SDK location not found"

**Fix:**
Create `frontend/android/local.properties`:
```
sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Error: "Gradle build failed"

**Fix:**
```cmd
cd android
gradlew.bat clean
gradlew.bat assembleDairimarDebug
```

### Error: "Cannot find gradlew.bat"

**Fix:** Make sure you're in the `frontend/android` directory:
```cmd
cd frontend/android
dir gradlew.bat
```

## 📊 Verifying Your APK

After building, verify the APK details:

```cmd
aapt dump badging app-dairimar-debug.apk
```

You should see:
- `package: name='com.usdt.dairimar'`
- `application-label:'Dairimar USDT'`

## 🌐 Changing API URL

To build apps that connect to a different server:

1. Edit the `.env.dairimar` file:
   ```env
   VITE_API_URL=https://your-server.com/api
   ```

2. Rebuild:
   ```cmd
   npm run android:dairimar
   ```

## 📦 Distribution

### Google Play Store
1. Build release APK with signing key
2. Create Google Play Developer account ($25 one-time fee)
3. Upload APKs to Play Console
4. Fill in app details, screenshots
5. Submit for review

### Direct Distribution
1. Share APK files directly
2. Users must enable "Install from Unknown Sources"
3. Users install manually

## 🔄 Update Process

When you make changes to the web app:

1. Make your changes to the frontend code
2. Rebuild the APK:
   ```cmd
   npm run android:dairimar
   ```
3. Increment version in `android/app/build.gradle`:
   ```gradle
   versionCode 2
   versionName "1.1"
   ```
4. Distribute new APK

## 📱 App Icons

To change app icons, replace these files in `android/app/src/main/res/`:
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

Or use Android Studio's Image Asset Studio:
1. Open project in Android Studio
2. Right-click `res` folder → New → Image Asset
3. Choose icon type and source

## 🎨 Splash Screen

Edit `android/app/src/main/res/values/styles.xml` for splash screen colors:

```xml
<item name="android:background">@color/your_color</item>
```

## 📝 Summary

**Quick commands:**
```cmd
# Build all three apps
npm run android:dairimar
npm run android:patty
npm run android:brian

# Find APKs in:
# frontend/android/app/build/outputs/apk/[flavor]/debug/
```

**Install on phone:**
```cmd
cd android
gradlew.bat install[Flavor]Debug
```

That's it! You now have 3 separate Android apps, each customized for a specific user role.
