# Quick Start Guide - After Deployment

## 🚀 First Time Setup (After Docker Build)

### Step 1: Access Your Main Dashboard
Open your browser and go to:
- **Local**: `http://localhost`
- **Production**: `https://powermental.vps.xxxx`

### Step 2: Set Exchange Rates

You'll see this section at the TOP of your main dashboard:

```
┌─────────────────────────────────────┐
│ 💱 Exchange Rate Management         │
├─────────────────────────────────────┤
│  VES Rate        COP Rate           │
│  Not Set         Not Set            │
│  [Update]        [Update]           │
└─────────────────────────────────────┘
```

**Click "Update" under VES Rate:**
1. Enter current rate (e.g., `40500`)
2. Click "Set Rate"
3. ✅ Done!

**Click "Update" under COP Rate:**
1. Enter current rate (e.g., `4200`)
2. Click "Set Rate"
3. ✅ Done!

### Step 3: View Daily Report

Scroll down to see:
```
┌─────────────────────────────────────┐
│ Daily Report          [Date Picker] │
├─────────────────────────────────────┤
│ VES Orders: 5 orders                │
│ COP Orders: 2 orders                │
│ Total USDT Sold: 1,234.56 USDT      │
│ Gross Profit: 123.46 USDT           │
└─────────────────────────────────────┘
```

### Step 4: Test Dairimar's One-Click Fulfill

1. Go to Dairimar's dashboard: `http://localhost/dairimar` or `https://dai.vps.xxxx`
2. You'll see at the top:
   ```
   Current VES Rate: 40,500 VES/USDT
   Set by admin at 10:30 AM
   ```
3. Scroll to pending orders - you'll see:
   ```
   Customer: Maria
   Amount: 5,000,000 VES
   → Will sell: 123.46 USDT  ← Auto-calculated!

   [Fulfill Order]  ← Just one click!
   ```
4. Click "Fulfill Order" - Done! No rate entry needed!

## 📋 What's Changed?

### For Brian (You):
- **Top of dashboard**: Rate management panel
- **Set rates anytime**: VES/COP rates update instantly for Dairimar
- **Daily reports**: See all activity at a glance
- **Rate history**: See all rate changes today

### For Dairimar:
- **One-click fulfill**: No more manual rate entry!
- **Current rate displayed**: Always knows what rate to use
- **Completed orders tab**: Can review fulfilled orders
- **Daily report**: See her performance

## 🔄 Daily Workflow

### Morning (Brian):
1. Check market rate for VES
2. Update VES rate on dashboard (takes 5 seconds)
3. View yesterday's daily report

### Throughout Day (Dairimar):
1. See new order arrive
2. Click "Fulfill Order"
3. Done! (literally 1 click)

### When Rate Changes (Brian):
1. Check market
2. Update VES rate
3. All pending orders now use new rate
4. Dairimar sees updated rate immediately

## 🎯 Key Features

**Exchange Rates**:
- Brian sets → Everyone uses
- Change anytime → Updates instantly
- Full history → See all changes

**Daily Reports**:
- On all dashboards
- View any past date
- Complete activity summary

**One-Click Fulfill**:
- No manual entry
- Auto-calculated amounts
- Optional custom rate override

## 🆘 Troubleshooting

**Don't see Exchange Rate Manager?**
- Clear browser cache
- Hard refresh (Ctrl+F5)
- Check you're on Main Dashboard (not Patty/Dairimar)

**No Daily Report?**
- Check date picker
- If today shows 0, that's normal (no orders yet)
- Try yesterday's date to see historical data

**Rate not showing on Dairimar's dashboard?**
- Make sure you SET the rate first on Main Dashboard
- Click "Refresh" button on Dairimar's dashboard

## 📱 Mobile Apps

After rebuilding mobile apps:
- Dairimar's app shows current rate at top
- One-click fulfill works the same
- Daily report included

---

**You're all set!** The system is now much faster and easier to use. 🎉
