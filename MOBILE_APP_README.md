# Dairimar USDT Mobile App

This is the Android mobile application specifically built for Dairimar's dashboard.

## Features

- **Dairimar Dashboard Only**: The mobile app automatically loads Dairimar's dashboard
- **USDT & VES Balance Tracking**: View current balances
- **USDT to VES Conversion**: Convert USDT to VES with exchange rate
- **VES Order Fulfillment**: View and fulfill pending VES orders
- **Pending Orders Alert**: Smart alerts for VES shortfall
- **Request USDT**: Request more USDT from Brian

## Prerequisites for Building

To build the Android APK, you need:

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17** - Usually installed with Android Studio
3. **Android SDK** - Installed via Android Studio

### Setting up Android Studio

1. Download and install Android Studio
2. Open Android Studio
3. Go to **Tools > SDK Manager**
4. Install:
   - Android SDK Platform (API 34 or latest)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android SDK Command-line Tools

## Building the APK

### Option 1: Using the Build Script (Easiest)

1. Open Command Prompt
2. Navigate to the frontend folder:
   ```
   cd C:\Users\brian\Documents\Exchange\frontend
   ```
3. Run the build script:
   ```
   build-apk.bat
   ```
4. Wait for the build to complete (first build may take 5-10 minutes)
5. The APK will be located at:
   ```
   frontend\android\app\build\outputs\apk\debug\app-debug.apk
   ```

### Option 2: Using Android Studio

1. Open Android Studio
2. Click **Open an existing project**
3. Navigate to and select: `C:\Users\brian\Documents\Exchange\frontend\android`
4. Wait for Gradle to sync
5. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
6. Wait for the build to complete
7. Click "locate" in the notification to find the APK

### Option 3: Command Line

```bash
cd C:\Users\brian\Documents\Exchange\frontend\android
gradlew.bat assembleDebug
```

The APK will be at: `app\build\outputs\apk\debug\app-debug.apk`

## Installing the APK

### On a Physical Device

1. Enable **Developer Options** on your Android phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Go to Settings > Developer Options
   - Enable "USB Debugging"
3. Connect your phone via USB
4. Transfer the APK file to your phone
5. Open the APK file on your phone and install
6. Allow "Install from Unknown Sources" if prompted

### On Android Emulator

1. Open Android Studio
2. Go to **Tools > Device Manager**
3. Create a new Virtual Device (if you don't have one)
4. Start the emulator
5. Drag and drop the APK onto the emulator window
6. The app will install automatically

## Configuration

### Connecting to Your Backend Server

The app needs to connect to your backend API. By default, it's configured for localhost.

#### For Testing on Physical Device

1. Find your computer's local IP address:
   - Windows: Open CMD and run `ipconfig`
   - Look for "IPv4 Address" (e.g., 192.168.1.100)

2. Make sure your phone and computer are on the same Wi-Fi network

3. Update the API URL:
   - Edit `frontend/.env.production`
   - Change `VITE_API_URL=http://localhost:3000/api` to:
     ```
     VITE_API_URL=http://192.168.1.100:3000/api
     ```
     (Replace with your actual IP)

4. Rebuild the app:
   ```bash
   cd frontend
   npm run build
   npx cap sync android
   cd android
   gradlew.bat assembleDebug
   ```

#### For Production Deployment

1. Deploy your backend to a server with a public domain
2. Update `frontend/.env.production`:
   ```
   VITE_API_URL=https://api.yourdomain.com/api
   ```
3. Rebuild and sign the APK for production

## Troubleshooting

### Build Errors

**"Command not found: gradlew"**
- Make sure you're in the `frontend/android` directory
- Android Studio needs to be installed

**"ANDROID_HOME not set"**
- Set the environment variable:
  ```
  set ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
  ```

**"Java version error"**
- Install Java JDK 17
- Set JAVA_HOME environment variable

### Connection Errors

**"Network Error" when using the app**
- Check if backend is running: `docker-compose ps`
- Verify the API URL is correct
- Make sure `android:usesCleartextTraffic="true"` is in AndroidManifest.xml (already configured)
- For physical devices, ensure phone and computer are on same network

**"Unable to connect to localhost"**
- Localhost doesn't work on physical devices
- Use your computer's local network IP address instead
- For emulator, use `http://10.0.2.2:3000/api`

## App Details

- **App Name**: Dairimar USDT
- **Package Name**: com.usdt.dairimar
- **Version**: 1.0.0
- **Platform**: Android 7.0+ (API 24+)

## Development

### Making Changes

1. Edit the React components in `frontend/src/`
2. Rebuild the frontend:
   ```bash
   cd frontend
   npm run build
   ```
3. Sync with Capacitor:
   ```bash
   npx cap sync android
   ```
4. Rebuild the APK

### Testing in Browser

You can test the mobile view in your browser:
1. Start the development server: `npm run dev`
2. Open http://localhost:5173/dairimar
3. Open browser DevTools (F12)
4. Toggle device toolbar (Ctrl+Shift+M)
5. Select a mobile device

## Next Steps

After building the APK:

1. **Test the app** on an emulator or physical device
2. **Configure the backend URL** for your network
3. **Test all features**:
   - View balances
   - Convert USDT to VES
   - Fulfill VES orders
   - Request USDT from Brian
4. **For production**: Sign the APK with a keystore and publish to Google Play Store

## Support

For issues or questions:
- Check the Docker logs: `docker-compose logs backend`
- Verify backend is running: http://localhost:3000/health
- Check mobile app logs in Android Studio Logcat
