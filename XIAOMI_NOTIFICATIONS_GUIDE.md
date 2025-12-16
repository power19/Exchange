# Xiaomi Notification Fix Guide

Xiaomi phones (MIUI) are notorious for aggressive battery optimization that prevents apps from showing notifications. Here's how to fix it:

## Step 1: Disable Battery Optimization for the Apps

1. Open **Settings**
2. Go to **Apps → Manage apps**
3. Find and tap **"Dairimar USDT"** (or Brian USDT, Patty USDT)
4. Tap **"Battery saver"**
5. Select **"No restrictions"**
6. Go back and tap **"Autostart"**
7. Turn **ON** the toggle
8. Repeat for all three USDT apps

## Step 2: Enable Notifications

1. In the same app settings screen
2. Tap **"Notifications"**
3. Make sure all notification types are **enabled**
4. Enable **"Show notifications"**
5. Enable **"Lock screen notifications"**
6. Enable **"Floating notifications"** (optional but helpful)

## Step 3: Disable MIUI Optimization (CRITICAL)

This is the most important step for Xiaomi phones:

1. Open **Settings**
2. Go to **Additional settings**
3. Tap **"Developer options"** 
   - If you don't see this, go to **About phone** → tap **MIUI version** 7 times to enable it
4. Scroll down to find **"MIUI optimization"**
5. Turn it **OFF**
6. Reboot your phone

## Step 4: Lock Apps in Recent Apps

1. Open **Recent apps** (square button)
2. Find **Dairimar USDT** app
3. Pull down on the app card
4. You'll see a **lock icon** appear
5. This prevents MIUI from killing the app
6. Repeat for all three USDT apps

## Step 5: Background Activity Permissions

1. Open **Settings → Apps → Manage apps**
2. Find **Dairimar USDT**
3. Tap **"Other permissions"**
4. Enable **"Display pop-up windows while running in the background"**
5. Enable **"Start in background"**

## Step 6: Clear App Data and Reinstall (If Still Not Working)

If notifications still don't work:

1. Uninstall the apps
2. Reboot your phone
3. Reinstall the APKs
4. When the app first opens, it will request notification permission
5. Tap **"Allow"** when prompted
6. Follow steps 1-5 above again

## Test Notifications

After completing all steps:

1. Open Brian's app
2. Create a new VES or COP order
3. Check if Dairimar's app shows a notification
4. Or have someone else submit an order

## Additional Tips for Xiaomi Phones

- **Don't use "Battery Saver" mode** - it will kill background apps
- **Don't use "Ultra Battery Saver"** - same issue
- **Check "Security" app** → "Boost" settings and whitelist the USDT apps
- Some MIUI versions have **"Battery & performance" → "Manage apps' battery usage"** - set all USDT apps to "No restrictions"

## Why Xiaomi Blocks Notifications

Xiaomi's MIUI is designed to maximize battery life by:
- Killing background processes aggressively
- Restricting app autostart
- Blocking notifications from apps not in a whitelist
- Clearing apps from memory frequently

This affects ALL apps, not just yours. Popular apps like WhatsApp, Telegram, etc. have special permissions built into MIUI, but custom apps need manual configuration.

## Alternative: Use Foreground Service (Future Enhancement)

If you still have issues, we can add a foreground service to the app that shows a persistent notification, which prevents Android from killing the app. This requires code changes though.

## Reference Links

- https://dontkillmyapp.com/xiaomi
- Xiaomi community forums for notification issues

---

**Note:** Different MIUI versions have slightly different menu names. The above guide is for MIUI 12-14. If your version is different, look for similar menu names.
