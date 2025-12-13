# Mobile App Build Guide

This guide explains how to build **separate Android apps** for Dairimar and Patty, each connecting to its own subdomain.

## Overview

You have **three separate apps/interfaces**:
- 🌐 **Web App** (all subdomains) - Runs in Docker on VPS
- 📱 **Dairimar's Android App** - Points to `https://dai.vps.xxxx/api`
- 📱 **Patty's Android App** - Points to `https://pato.vps.xxxx/api`

Each Android app has its own:
- App ID (`com.usdt.dairimar` vs `com.usdt.patty`)
- App Name ("Dairimar USDT" vs "Patty USDT")
- API URL (dai subdomain vs pato subdomain)
- Dashboard view

## Prerequisites

- Node.js installed
- Android Studio installed
- Java JDK installed
- VPS already deployed with subdomains working

## Configuration Files

### For Dairimar's App
- **Environment**: `.env.dairimar`
- **Capacitor Config**: `capacitor.config.dairimar.ts`
- **App ID**: `com.usdt.dairimar`
- **API URL**: `https://dai.vps.xxxx/api`

### For Patty's App
- **Environment**: `.env.patty`
- **Capacitor Config**: `capacitor.config.patty.ts`
- **App ID**: `com.usdt.patty`
- **API URL**: `https://pato.vps.xxxx/api`

## Before Building (Update Production URLs)

### Step 1: Update Dairimar's Environment

Edit `frontend/.env.dairimar`:
```bash
# Replace vps.xxxx with your actual domain
VITE_MOBILE_API_URL=https://dai.yourdomain.com/api
VITE_APP_NAME=Dairimar USDT
VITE_APP_DASHBOARD=dairimar
```

### Step 2: Update Patty's Environment

Edit `frontend/.env.patty`:
```bash
# Replace vps.xxxx with your actual domain
VITE_MOBILE_API_URL=https://pato.yourdomain.com/api
VITE_APP_NAME=Patty USDT
VITE_APP_DASHBOARD=patty
```

## Building Dairimar's App

### Option A: Using npm script (Recommended)

```bash
cd frontend

# Build and sync Dairimar's app
npm run sync:dairimar
```

This will:
1. Build the React app with Dairimar's config
2. Sync to Android project with correct app ID
3. Ready to open in Android Studio

### Option B: Manual steps

```bash
cd frontend

# Step 1: Build with Dairimar's environment
npm run build:dairimar

# Step 2: Sync to Android
npx cap sync android --config capacitor.config.dairimar.ts

# Step 3: Open in Android Studio
npx cap open android
```

### Step 3: Build APK in Android Studio

1. Open `frontend/android` folder in Android Studio
2. Wait for Gradle sync to complete
3. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. APK will be at: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
5. **Rename** to `dairimar.apk` to avoid confusion

## Building Patty's App

### Option A: Using npm script (Recommended)

```bash
cd frontend

# Build and sync Patty's app
npm run sync:patty
```

### Option B: Manual steps

```bash
cd frontend

# Step 1: Build with Patty's environment
npm run build:patty

# Step 2: Sync to Android
npx cap sync android --config capacitor.config.patty.ts

# Step 3: Open in Android Studio
npx cap open android
```

### Step 3: Build APK in Android Studio

1. Open `frontend/android` folder in Android Studio
2. Wait for Gradle sync to complete
3. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. APK will be at: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
5. **Rename** to `patty.apk` to avoid confusion

## Important Notes

### ⚠️ One Android Project, Two Apps

Both apps use the **same Android project folder** (`frontend/android`), but with different configurations.

**When switching between building apps:**
1. Always run the appropriate sync command
2. Wait for Gradle sync in Android Studio
3. Clean build if needed: **Build** → **Clean Project**

### App IDs Are Different

- **Dairimar**: `com.usdt.dairimar`
- **Patty**: `com.usdt.patty`

This means both apps can be installed on the same device without conflicts.

### API URLs Are Different

- **Dairimar's app** → Connects to `https://dai.vps.xxxx/api`
- **Patty's app** → Connects to `https://pato.vps.xxxx/api`

Make sure your VPS subdomains are working before installing the apps!

## Testing the Apps

### Test Locally (Before Production)

Keep the local API URL for testing:
```bash
# .env.dairimar (for local testing)
VITE_MOBILE_API_URL=http://10.10.30.100:3000/api
```

Then switch to production URLs when ready to deploy.

### Test Production URLs

After building with production URLs:
1. Install APK on device
2. Open app
3. Check console logs (if debugging enabled)
4. Verify it connects to the right subdomain

### Quick Test Checklist

For **Dairimar's App**:
- [ ] App opens to Dairimar's dashboard
- [ ] Shows VES balance
- [ ] Shows USDT balance
- [ ] Shows pending VES orders
- [ ] "Test" notification button works
- [ ] Can convert USDT to VES
- [ ] Can fulfill VES orders
- [ ] Notifications arrive for new orders

For **Patty's App**:
- [ ] App opens to Patty's dashboard
- [ ] Shows Dairimar's VES balance
- [ ] Can submit VES orders
- [ ] Can submit COP orders
- [ ] Shows order history

## Troubleshooting

### API Connection Failed

**Check:**
1. Is VPS running? `docker-compose -f docker-compose.prod.yml ps`
2. Is subdomain accessible? Open `https://dai.vps.xxxx/api/balances` in browser
3. Is SSL working? Should show HTTPS with valid certificate
4. Is app using correct URL? Check `.env.dairimar` or `.env.patty`

### Wrong Dashboard Showing

**Issue**: App shows wrong dashboard (e.g., Dairimar app showing Patty's view)

**Fix:**
1. Make sure you ran the correct sync command
2. Clean and rebuild in Android Studio
3. Uninstall old app from device
4. Install fresh APK

### App Crashes on Launch

**Check:**
1. Android Studio logs
2. Make sure backend API is accessible
3. Check CORS settings on backend
4. Try rebuilding with clean: `npm run sync:dairimar` or `npm run sync:patty`

### Can't Build Second App

**Issue**: Built Dairimar's app, now Patty's won't build

**Fix:**
```bash
# Clean everything
cd frontend/android
./gradlew clean

# Then rebuild
cd ..
npm run sync:patty
```

## Complete Build Process (Both Apps)

```bash
cd frontend

# 1. Update environment files with production URLs
nano .env.dairimar  # Update API URL
nano .env.patty     # Update API URL

# 2. Build Dairimar's app
npm run sync:dairimar
# Open in Android Studio, build APK, rename to dairimar.apk

# 3. Clean Android project
cd android && ./gradlew clean && cd ..

# 4. Build Patty's app
npm run sync:patty
# Open in Android Studio, build APK, rename to patty.apk
```

## Distribution

### To Dairimar:
1. Send `dairimar.apk`
2. Install on her phone
3. Open app - should show "Dairimar USDT"
4. Verify notifications are working

### To Patty:
1. Send `patty.apk`
2. Install on her phone
3. Open app - should show "Patty USDT"
4. Verify can submit orders

## Quick Reference

### Build Commands

```bash
# Dairimar's app
npm run sync:dairimar

# Patty's app
npm run sync:patty

# Web app (for Docker deployment)
npm run build
```

### Check API Connection

```bash
# Dairimar's subdomain
curl https://dai.vps.xxxx/api/balances

# Patty's subdomain
curl https://pato.vps.xxxx/api/balances
```

### File Locations

- Dairimar APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- Patty APK: Same location (rename each one after building)
- Environment configs: `frontend/.env.dairimar` and `frontend/.env.patty`

---

## Summary

1. ✅ Update `.env.dairimar` and `.env.patty` with production domains
2. ✅ Run `npm run sync:dairimar` → Build in Android Studio → Rename APK
3. ✅ Clean project
4. ✅ Run `npm run sync:patty` → Build in Android Studio → Rename APK
5. ✅ Test both apps on devices
6. ✅ Distribute to users

Both apps will connect to their respective subdomains and work independently! 🎉
