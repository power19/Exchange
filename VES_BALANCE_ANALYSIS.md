# VES Balance Calculation Analysis and Fixes

## Summary

Analysis of the VES balance calculation system identified potential issues with BIGINT handling and provided improvements to ensure accurate balance calculations.

## Issues Identified

### 1. BIGINT Type Conversion Issue

**Location**: `backend/src/services/balanceService.ts`

**Problem**:
- PostgreSQL's `SUM()` function on BIGINT columns returns a NUMERIC type
- The NUMERIC type is often returned to JavaScript as a string to avoid precision loss
- Previous code used `parseInt()` directly without checking if the value was already a number
- This could potentially cause issues if PostgreSQL returns the value in unexpected format

**Example**:
```typescript
// OLD CODE - Less robust
const totalConverted = parseInt(conversionsResult.rows[0].total, 10);

// NEW CODE - Handles both string and number returns
const totalConvertedRaw = conversionsResult.rows[0].total;
const totalConverted = typeof totalConvertedRaw === 'string'
  ? parseInt(totalConvertedRaw, 10)
  : Number(totalConvertedRaw);
```

### 2. Potential Rounding Discrepancies

**Location**:
- `backend/src/routes/conversions.ts:67` (conversion)
- `backend/src/routes/vesOrders.ts:189` (fulfillment)

**How VES is calculated**:

**During Conversion (USDT → VES)**:
```typescript
const ves_received = Math.round(usdt_amount * exchange_rate);
```
Example: `100 USDT × 40,123.45 = 4,012,345 VES` (rounded)

**During Fulfillment (VES order → USDT)**:
```typescript
const usdt_sold = amount_ves / exchange_rate;
```
Example: `4,012,345 VES ÷ 40,123.45 = 100.00 USDT`

**Potential Issue**:
If exchange rates differ between conversion and fulfillment, small discrepancies can accumulate:
```
Conversion:  100 USDT × 40,000.00 = 4,000,000 VES
Fulfillment: 3,500,000 VES ÷ 42,000.00 = 83.33 USDT

Balance: 4,000,000 - 3,500,000 = 500,000 VES remaining ✓
```

This is **working as designed** - the VES balance tracks actual VES in/out, not USDT equivalents.

## Fixes Applied

### ✅ Improved BIGINT Handling

Updated three functions in `balanceService.ts`:

1. **`getDaiVESBalance()`** - Lines 67-102
   - Safely converts BIGINT SUM results
   - Handles both string and number returns from PostgreSQL
   - Adds validation to detect NaN values

2. **`getPendingVESTotal()`** - Lines 182-205
   - Same robust type conversion
   - Validation for invalid values

### ✅ Created Verification Script

**File**: `backend/src/scripts/verifyVESBalance.ts`

**Purpose**: Diagnose VES balance discrepancies by comparing:
- Raw database values
- Calculated balances
- Service-level balances
- Data types returned by PostgreSQL

**Run with**:
```bash
cd backend
npm run verify-ves
```

**The script will show**:
- All recent conversions with calculated vs stored VES amounts
- All completed VES orders with calculated USDT values
- Total VES converted, sold, and pending
- Comparison between manual calculation and service calculation
- Data type information
- Any discrepancies found

## How to Diagnose VES Balance Issues

### Step 1: Run the Verification Script

```bash
cd backend
npm run verify-ves
```

This will output a detailed report showing:
- Total VES converted from all conversions
- Total VES sold in completed orders
- Expected balance (converted - sold)
- Actual balance from BalanceService
- Any discrepancies

### Step 2: Check for Common Issues

**Issue**: Balance shows negative or incorrect amount
**Diagnosis**:
```sql
-- Check if any completed orders exceed converted VES
SELECT
  (SELECT COALESCE(SUM(ves_received), 0) FROM conversions) as converted,
  (SELECT COALESCE(SUM(amount_ves), 0) FROM ves_orders WHERE status = 'COMPLETED') as sold,
  (SELECT COALESCE(SUM(ves_received), 0) FROM conversions) -
  (SELECT COALESCE(SUM(amount_ves), 0) FROM ves_orders WHERE status = 'COMPLETED') as balance;
```

**Issue**: Fulfilled order shows insufficient balance error
**Diagnosis**: Check if VES balance calculation is correct at the time of fulfillment
```sql
-- Get balance at specific point in time
SELECT
  (SELECT COALESCE(SUM(ves_received), 0) FROM conversions WHERE date <= '2024-01-15') as converted_until_date,
  (SELECT COALESCE(SUM(amount_ves), 0) FROM ves_orders WHERE status = 'COMPLETED' AND date_completed <= '2024-01-15') as sold_until_date;
```

### Step 3: Verify Data Integrity

**Check for missing exchange rates**:
```sql
SELECT id, customer_name, amount_ves, status, exchange_rate, usdt_sold
FROM ves_orders
WHERE status = 'COMPLETED' AND (exchange_rate IS NULL OR usdt_sold IS NULL);
```

**Check for cancelled orders affecting balance**:
```sql
SELECT COUNT(*), COALESCE(SUM(amount_ves), 0)
FROM ves_orders
WHERE status = 'CANCELLED';
```
*Note: Cancelled orders should NOT affect balance - only COMPLETED orders do*

## Testing the Fixes

### Test 1: Basic Balance Calculation
```bash
# Start backend
cd backend
npm run dev

# In another terminal, make API call
curl http://localhost:3000/api/balances
```

Expected response:
```json
{
  "brian_usdt": 1000.00,
  "dai_usdt": 500.00,
  "dai_ves": 20000000
}
```

### Test 2: Verify with Script
```bash
cd backend
npm run verify-ves
```

Expected output:
```
✅ Balance calculations MATCH! (20000000 VES)
```

### Test 3: Fulfill Order Test

1. Check current balance: `GET /api/balances`
2. Submit VES order: `POST /api/ves-orders` with `amount_ves: 1000000`
3. Fulfill order: `POST /api/ves-orders/:id/fulfill` with `exchange_rate: 40000`
4. Check balance again - should be reduced by 1,000,000 VES

## Formula Reference

### Dairimar's VES Balance
```
VES Balance = SUM(conversions.ves_received) - SUM(ves_orders.amount_ves WHERE status='COMPLETED')
```

**NOT affected by**:
- PENDING orders (not yet fulfilled)
- CANCELLED orders (won't be fulfilled)
- Exchange rate changes
- USDT calculations

**Only affected by**:
- New conversions (adds VES)
- Completing VES orders (subtracts VES)

### Related Calculations

**USDT sold from VES orders** (for profit calculation):
```
Total USDT from VES = SUM(ves_orders.usdt_sold WHERE status='COMPLETED')
```

**Pending VES needed**:
```
Pending Total = SUM(ves_orders.amount_ves WHERE status='PENDING')
```

**VES shortfall** (for alerts):
```
Shortfall = Pending Total - Current VES Balance
```
- If positive: Need more VES
- If negative or zero: Have sufficient VES

## Common Mistakes to Avoid

❌ **Don't** manually update balance fields (they don't exist - calculated only)
❌ **Don't** include PENDING or CANCELLED orders in balance calculation
❌ **Don't** use `parseFloat()` for VES amounts (they're integers)
❌ **Don't** forget to set exchange_rate when fulfilling orders

✅ **Do** use the BalanceService for all balance queries
✅ **Do** validate balances before allowing fulfillment
✅ **Do** use integers for VES amounts (no decimals)
✅ **Do** run verification script after bulk operations

## Files Modified

1. `backend/src/services/balanceService.ts` - Improved BIGINT handling
2. `backend/src/scripts/verifyVESBalance.ts` - New verification script
3. `backend/package.json` - Added `verify-ves` command

## Next Steps

1. **Run the verification script** to check current database state:
   ```bash
   npm run verify-ves
   ```

2. **Review the output** - if discrepancies are found:
   - Check the raw data shown in the report
   - Look for completed orders without exchange rates
   - Verify no cancelled orders are being counted

3. **If discrepancies persist**, investigate:
   - Database connection configuration (pg driver settings)
   - Any direct database modifications bypassing the API
   - Historical data migrations or imports

4. **Monitor** balance calculations after deployment:
   - Add logging to balance service calls
   - Set up alerts for negative balances
   - Periodically run verification script

## Support

If you continue to see VES balance discrepancies after applying these fixes:

1. Run the verification script and save the output
2. Check the database directly for the raw SUM values
3. Compare the verification script output with the expected values
4. Look for any patterns in the discrepancies (specific dates, amounts, etc.)

The verification script provides detailed debugging information to help identify the root cause.
