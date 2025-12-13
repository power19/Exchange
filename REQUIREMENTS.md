# USDT Exchange Service Tracking System

## Overview
A tracking system for managing USDT exchange operations involving three people: Brian (Owner), Dairimar (VES Handler), and Patty (Customer Acquisition).

## Multi-Subdomain Architecture
The system is deployed on a VPS with three separate dashboards accessible via subdomains:

- **`powermental.vps.xxxx`** - Main dashboard (Brian - full visibility and control)
- **`pato.vps.xxxx`** - Patty's dashboard (customer order submission)
- **`dai.vps.xxxx`** - Dairimar's dashboard (VES order fulfillment and balance management)

Each subdomain provides a tailored interface based on user role and responsibilities.

---

## Business Model

### Revenue Structure
- **Purchase Cost**: USDT purchased with 1-5% fee
- **Profit Margin**: 10% on all USDT sold (both VES and COP)
- **Fee Note**: The purchase fee is a cost; profit comes from sales

### Example
- Buy 1000 USDT with 4% fee = $1,040 cost
- Sell 1000 USDT with 10% profit = Gross revenue reflects 10% margin
- Net profit calculated from total USDT sold

---

## Workflows

### VES Workflow (Brian → Dairimar → Customers via Patty)

#### Flow:
1. **Brian buys USDT** (pays 1-5% fee)
2. **Brian transfers USDT to Dairimar**
3. **Dairimar converts USDT → VES** (on Bybit P2P, flexible timing)
4. **Patty submits VES customer order** → Status: PENDING
5. **Dairimar fulfills order** (adds exchange rate, marks complete) → Status: COMPLETED
6. System calculates USDT sold for profit tracking

#### Example:
```
Brian buys: 1000 USDT (4% fee = $1,040 cost)
Brian transfers: 400 USDT to Dai
  - Brian has: 600 USDT
  - Dai has: 400 USDT

Dai converts: 100 USDT → 4,000,000 VES (rate: 40,000 VES/USDT)
  - Dai has: 300 USDT + 4,000,000 VES

Patty submits orders:
  - Customer 1: 2,000,000 VES [PENDING]
  - Customer 2: 1,500,000 VES [PENDING]

Dai fulfills orders:
  - Customer 1: Rate 40,000 VES/USDT → 50 USDT sold [COMPLETED]
  - Customer 2: Rate 40,000 VES/USDT → 37.5 USDT sold [COMPLETED]

Dai's remaining balance:
  - 300 USDT
  - 500,000 VES
```

### COP Workflow (Brian ↔ Customers via Patty)

#### Flow:
1. **Patty submits COP customer order** → Status: PENDING
2. **Brian fulfills order** (adds exchange rate, sells USDT on Bybit P2P) → Status: COMPLETED
3. System calculates USDT sold for profit tracking
4. **Customer receives COP**

#### Example:
```
Patty submits: Customer needs 400,000 COP [PENDING]

Brian fulfills: 
  - Exchange rate: 4,000 COP/USDT
  - USDT sold: 100 USDT [COMPLETED]
  - Brian's balance: 600 - 100 = 500 USDT
```

---

## Multi-Subdomain Dashboard Architecture

### `powermental.vps.xxxx` - Main Dashboard (Brian)

#### Public View (Default - No Login)
**Who sees it**: Brian (before login), Dairimar, Patty

**Visible Data**:
- Brian's USDT balance
- Dairimar's USDT balance
- Dairimar's VES balance
- Total USDT sold (combined VES + COP)
- All transaction history
- All customer orders (VES + COP) with status
- Pending orders queue (both VES and COP)

**Actions Available**:
- Buy USDT
- Transfer USDT to Dairimar
- Override/edit transactions (admin controls)
- Fulfill COP orders (add exchange rate, mark complete)

#### Private View (After Login - Brian Only)
**Additional Data Visible**:
- **Profit Overview**
  - Total USDT sold × 10% = Total profit earned
  - Available profit (not withdrawn)
  - Withdrawn profit (history)
  
- **Budget Management**
  - Withdraw profit functionality
  - Withdrawal history (date, amount)
  - Real-time profit balance
  - Business performance metrics

**Login Feature**:
- Small "Login" button (top right corner)
- Password-protected (Brian only)
- Switches to "Logout" when authenticated
- Reveals profit/budget section

---

### `pato.vps.xxxx` - Patty's Dashboard

**Who accesses**: Patty only

**Visible Data**:
- Dairimar's VES balance (to know if VES orders can be fulfilled)
- Her submitted orders (both VES and COP)
- Order status (Pending/Completed)
- Order history

**Actions Available**:
- Submit new VES customer order (customer name, VES amount)
- Submit new COP customer order (customer name, COP amount)
- View order status and history

**Cannot See**:
- Brian's USDT balance
- Dairimar's USDT balance
- Profit information
- Purchase/transfer history
- Exchange rates used (unless in completed order details)

**Features**:
- Simple, clean interface focused on order submission
- Clear visibility of Dai's VES availability
- Order status tracking

---

### `dai.vps.xxxx` - Dairimar's Dashboard

**Who accesses**: Dairimar only

**Visible Data**:
- Her USDT balance
- Her VES balance
- **Pending VES orders queue** with:
  - Individual order details (customer, amount, date submitted)
  - **Total VES needed** (sum of all pending orders)
  - **Balance status**: Sufficient or shortfall alert
  - Auto-calculation: "Need X more VES" or "Need to convert Y USDT"
- Completed VES orders history
- Conversion history (USDT → VES)

**Actions Available**:
- Convert USDT → VES (enter amount and exchange rate)
- Fulfill pending VES orders (add exchange rate, mark complete)
- **Request USDT from Brian** (notification/flag system)
- View order and conversion history

**Cannot See**:
- Brian's USDT balance
- Profit information
- Brian's purchase history
- COP orders (not relevant to her role)
- Patty's activity beyond order submissions

**Smart Features**:
1. **Pending Orders Summary Card**:
   ```
   Pending Orders: 5
   Total VES Needed: 15,000,000 VES
   Your VES Balance: 10,000,000 VES
   Shortfall: 5,000,000 VES ⚠️
   → Suggested: Convert ~125 USDT (at 40,000 rate)
   ```

2. **Sufficient Balance Indicator**:
   ```
   Pending Orders: 3
   Total VES Needed: 8,000,000 VES
   Your VES Balance: 10,000,000 VES
   Status: ✓ Sufficient balance
   ```

3. **Quick Actions**:
   - "Convert USDT to fulfill all orders" (pre-calculates amount needed)
   - "Request more USDT from Brian" button

---

## Order Visibility Matrix

| Order Type | Created By | Visible On | Fulfilled By |
|------------|-----------|------------|--------------|
| VES Order | Patty | `pato`, `dai`, `powermental` | Dairimar |
| COP Order | Patty | `pato`, `powermental` | Brian |

## Order Status Flow

### VES Orders:
```
Patty submits → PENDING → Shows on Dai's dashboard
                       ↓
              Dai adds exchange rate
                       ↓
                  COMPLETED → Updates everywhere
```

### COP Orders:
```
Patty submits → PENDING → Shows on Brian's dashboard
                       ↓
            Brian adds exchange rate
                       ↓
                  COMPLETED → Updates everywhere
```

---

## Data Structure

### 1. USDT Purchases
```
Purchase Record:
- ID (auto-increment)
- Date
- Amount (USDT)
- Fee percentage (1-5%)
- Total cost ($)
- Status (active/completed)
```

### 2. Transfers to Dairimar
```
Transfer Record:
- ID (auto-increment)
- Date
- Amount (USDT)
- Brian's remaining balance
- Dai's new balance
```

### 3. Dairimar's USDT → VES Conversions
```
Conversion Record:
- ID (auto-increment)
- Date
- USDT amount converted
- VES received
- Exchange rate (VES/USDT)
- Dai's remaining USDT
- Dai's new VES balance
```

### 4. Customer Orders (VES)
```
VES Order Record:
- ID (auto-increment)
- Date submitted
- Customer name
- Amount (VES)
- Submitted by: Patty
- Status: PENDING / COMPLETED
- Exchange rate (filled when completed)
- USDT sold (calculated when completed: VES amount ÷ exchange rate)
- Fulfilled by: Dairimar
- Date completed
- Dai's remaining VES balance (after completion)
```

### 5. Customer Orders (COP)
```
COP Order Record:
- ID (auto-increment)
- Date submitted
- Customer name
- Amount (COP)
- Submitted by: Patty
- Status: PENDING / COMPLETED
- Exchange rate (filled when completed)
- USDT sold (calculated when completed: COP amount ÷ exchange rate)
- Fulfilled by: Brian
- Date completed
- Brian's remaining USDT balance (after completion)
```

### 6. Profit Withdrawals (Private)
```
Withdrawal Record:
- ID (auto-increment)
- Date
- Amount (USDT equivalent)
- Remaining profit balance
- Notes
```

### 7. USDT Requests (Dairimar → Brian)
```
Request Record:
- ID (auto-increment)
- Date requested
- Amount requested (USDT)
- Reason (e.g., "Need to fulfill pending orders")
- Status: PENDING / FULFILLED / REJECTED
- Date resolved
- Notes from Brian
```

---

## Key Metrics to Track

### Real-Time Balances
```
Brian's Balance:
- USDT purchased - USDT transferred to Dai - USDT sold (COP completed orders)

Dairimar's Balances:
- USDT: Received from Brian - Converted to VES
- VES: Converted from USDT - Sent to customers (VES completed orders)
```

### Sales Tracking
```
Total USDT Sold = VES completed orders (in USDT) + COP completed orders (in USDT)
Profit = Total USDT Sold × 10%
Available Profit = Total Profit - Withdrawn Profit
```

### Order Metrics
```
Pending VES Orders:
- Count of orders
- Total VES needed
- Dai's VES balance status (sufficient/shortfall)

Pending COP Orders:
- Count of orders
- Total COP needed
- Brian's USDT balance status

Completed Orders:
- Total orders completed today/week/month
- Average exchange rates
- Volume trends
```

### Alerts/Warnings
- Low VES balance warning (when Dai's VES < total pending VES orders)
- Low USDT balance warning (Brian's balance < threshold)
- Pending customer orders notification (for Dai and Brian)
- USDT request from Dairimar (notification for Brian)

---

## Dashboard Features by Subdomain

### `powermental.vps.xxxx` - Main Dashboard (Brian)

#### Summary Cards (Public View)
1. **Brian's USDT Balance**
   - Current amount
   - Last purchase date
   - Quick "Buy USDT" button

2. **Dairimar's Balances**
   - USDT balance
   - VES balance
   - Last conversion date
   - Quick "Transfer to Dai" button

3. **Total USDT Sold**
   - Combined VES + COP (completed orders only)
   - No profit shown (unless logged in)

4. **Pending Orders Overview**
   - VES orders pending (count + total amount)
   - COP orders pending (count + total amount)
   - Visual indicators for urgency

#### Transaction Sections (Public View)
1. **Recent Purchases**
   - Table: Date, Amount (USDT), Fee %, Total Cost
   - "Buy USDT" button

2. **Transfers to Dairimar**
   - Table: Date, Amount (USDT), Remaining Balance
   - "Transfer to Dai" button

3. **Dairimar's Conversions**
   - Table: Date, USDT Converted, VES Received, Rate
   - View only (Dai performs these)

4. **Pending VES Orders**
   - Table: Order ID, Customer, Amount (VES), Date Submitted
   - Status: PENDING
   - Assigned to: Dairimar
   - Monitor Dai's work progress

5. **Pending COP Orders**
   - Table: Order ID, Customer, Amount (COP), Date Submitted
   - Status: PENDING
   - "Fulfill Order" button (add rate, mark complete)

6. **Completed Orders History**
   - Combined VES + COP orders
   - Table: Date, Customer, Type (VES/COP), Amount, Rate, USDT Sold, Fulfilled By
   - Filter by date, type, handler

#### Private Dashboard Additions (After Login)

**Profit Overview Card**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 PROFIT DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Profit Earned:    XXX USDT
Available Balance:      XXX USDT
Total Withdrawn:        XXX USDT

[Withdraw Profit Button]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Profit Breakdown**
- Profit from VES sales: XXX USDT (from Y orders)
- Profit from COP sales: XXX USDT (from Z orders)
- Total profit: XXX USDT
- Profit margin: 10%

**Withdrawal Management**
- "Withdraw Profit" button (opens modal)
- Withdrawal history table: Date, Amount, Balance After, Notes
- Quick stats: Total withdrawn this month, YTD

**Business Performance Metrics**
- Total USDT purchased
- Total USDT sold
- Net profit after fees
- Monthly trends chart (if applicable)
- Average exchange rates (VES, COP)

---

### `pato.vps.xxxx` - Patty's Dashboard

#### Summary Cards
1. **Dairimar's VES Balance**
   - Current VES available
   - Visual indicator: Green (sufficient) / Yellow (low) / Red (empty)
   - Helps Patty know if VES orders can be fulfilled

2. **My Order Statistics**
   - Total orders submitted (today/week/month)
   - Pending orders count
   - Completed orders count

#### Main Sections

**Submit New Order**
- Two tabs: "VES Order" and "COP Order"
- Simple form:
  - Customer name
  - Amount (VES or COP)
  - Submit button
- Confirmation message after submission

**My Pending Orders**
- Table: Order ID, Customer, Type (VES/COP), Amount, Date Submitted, Status
- Clear visual for PENDING status
- No ability to edit or delete (contact Brian)

**My Completed Orders**
- Table: Order ID, Customer, Type, Amount, Exchange Rate, USDT Sold, Date Completed, Completed By
- Filter by date, type

**Quick Stats**
- Orders submitted this week
- Orders completed this week
- Response time (average time from submission to completion)

---

### `dai.vps.xxxx` - Dairimar's Dashboard

#### Summary Cards

1. **My USDT Balance**
   - Current USDT available
   - Last received from Brian (date, amount)
   - Quick "Convert to VES" button

2. **My VES Balance**
   - Current VES available
   - Last conversion (date, amount)
   - Visual indicator: Sufficient / Low / Critical

3. **Pending Orders Alert**
   ```
   ⚠️ PENDING ORDERS OVERVIEW
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Pending Orders:      5 orders
   Total VES Needed:    15,000,000 VES
   Your VES Balance:    10,000,000 VES
   
   ❌ SHORTFALL:        5,000,000 VES
   
   💡 Suggestion:
   Convert ~125 USDT at 40,000 rate
   
   [Convert USDT] [Request More USDT]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   OR (if sufficient):
   ```
   ✅ PENDING ORDERS OVERVIEW
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Pending Orders:      3 orders
   Total VES Needed:    8,000,000 VES
   Your VES Balance:    10,000,000 VES
   
   ✓ Sufficient balance to fulfill all orders
   
   [Start Fulfilling Orders]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

#### Main Sections

**Pending VES Orders Queue**
- Table: Order ID, Customer, Amount (VES), Date Submitted, Days Pending
- Each row has "Fulfill" button
- Click "Fulfill" opens modal:
  - Customer name (read-only)
  - Amount VES (read-only)
  - **Enter exchange rate** (input field)
  - Auto-calculate USDT sold
  - Confirm button
- Batch fulfill option: "Fulfill all with same rate"

**Quick Actions**
- "Convert USDT to VES" (opens conversion form)
- "Request USDT from Brian" (opens request form with suggested amount)
- "View pending orders summary"

**Convert USDT to VES Form**
- USDT amount to convert (with balance check)
- Exchange rate (VES/USDT)
- Auto-calculate VES received
- Confirm button
- Shows updated balances after conversion

**Request USDT Form**
- Amount requested (USDT)
- Reason dropdown:
  - Need to fulfill pending orders
  - Low balance alert
  - Other (text field)
- Auto-populate based on pending orders
- Submit request button
- View pending requests status

**Completed Orders History**
- Table: Order ID, Customer, VES Amount, Exchange Rate, USDT Sold, Date Completed
- Filter by date
- Export option

**Conversion History**
- Table: Date, USDT Converted, VES Received, Exchange Rate
- Monthly summary

---

## User Actions & Forms

### Actions on `powermental.vps.xxxx` (Brian)

#### 1. Buy USDT
```
Input Fields:
- Amount (USDT)
- Fee percentage (1-5%)
- Date (default: today)

Auto-calculate:
- Total cost ($)

Updates:
- Brian's USDT balance (+amount)
- Purchase history
```

#### 2. Transfer to Dairimar
```
Input Fields:
- Amount (USDT)
- Date (default: today)

Validation:
- Amount ≤ Brian's current balance

Updates:
- Brian's USDT balance (-amount)
- Dai's USDT balance (+amount)
- Transfer history
```

#### 3. Fulfill COP Order
```
Display:
- Order ID (read-only)
- Customer name (read-only)
- Amount COP (read-only)
- Date submitted (read-only)

Input Fields:
- **Exchange rate (COP/USDT)**
- Date completed (default: today)

Auto-calculate:
- USDT sold = COP amount ÷ exchange rate

Validation:
- USDT sold ≤ Brian's current balance
- Exchange rate > 0

Updates:
- Brian's USDT balance (-USDT sold)
- Order status: PENDING → COMPLETED
- Total USDT sold (+USDT sold)
- Profit calculation (private view)
```

#### 4. Withdraw Profit (Private - After Login)
```
Display:
- Available profit balance

Input Fields:
- Amount to withdraw (USDT)
- Date (default: today)
- Notes (optional)

Validation:
- Amount ≤ Available profit

Updates:
- Available profit (-amount)
- Withdrawn profit (+amount)
- Withdrawal history
```

---

### Actions on `pato.vps.xxxx` (Patty)

#### 1. Submit VES Customer Order
```
Input Fields:
- Customer name
- Amount (VES)
- Date (default: today)

Validation:
- Amount > 0
- Customer name not empty

Creates:
- New VES order with status: PENDING
- Assigned to: Dairimar
- Visible on: Patty's dashboard, Dai's dashboard, Main dashboard

Updates:
- Patty's order count
- Dai's pending orders queue
```

#### 2. Submit COP Customer Order
```
Input Fields:
- Customer name
- Amount (COP)
- Date (default: today)

Validation:
- Amount > 0
- Customer name not empty

Creates:
- New COP order with status: PENDING
- Assigned to: Brian
- Visible on: Patty's dashboard, Main dashboard (NOT on Dai's)

Updates:
- Patty's order count
- Brian's pending orders queue
```

---

### Actions on `dai.vps.xxxx` (Dairimar)

#### 1. Convert USDT to VES
```
Input Fields:
- USDT amount to convert
- Exchange rate (VES/USDT)
- Date (default: today)

Auto-calculate:
- VES received = USDT amount × exchange rate

Validation:
- Amount ≤ Dai's current USDT balance
- Exchange rate > 0

Updates:
- Dai's USDT balance (-amount)
- Dai's VES balance (+VES received)
- Conversion history
- Pending orders alert (recalculate shortfall/sufficient)
```

#### 2. Fulfill VES Order
```
Display:
- Order ID (read-only)
- Customer name (read-only)
- Amount VES (read-only)
- Date submitted (read-only)

Input Fields:
- **Exchange rate (VES/USDT)**
- Date completed (default: today)

Auto-calculate:
- USDT sold = VES amount ÷ exchange rate

Validation:
- VES amount ≤ Dai's current VES balance
- Exchange rate > 0

Updates:
- Dai's VES balance (-VES amount)
- Order status: PENDING → COMPLETED
- Total USDT sold (+USDT sold)
- Profit calculation (Brian's private view)
- Pending orders summary (recalculate)
```

#### 3. Batch Fulfill Orders (Same Rate)
```
Display:
- List of selected pending orders
- Total VES needed

Input Fields:
- **Exchange rate (VES/USDT)** (applies to all)
- Date completed (default: today)

Auto-calculate:
- Total USDT sold
- VES balance after fulfillment

Validation:
- Total VES ≤ Dai's current VES balance
- Exchange rate > 0

Updates:
- Dai's VES balance (-total VES)
- All selected orders: PENDING → COMPLETED
- Total USDT sold (+total USDT sold)
- Profit calculation
```

#### 4. Request USDT from Brian
```
Input Fields:
- Amount requested (USDT)
- Reason (dropdown):
  * Need to fulfill pending orders
  * Low balance alert
  * Upcoming large order
  * Other (text field)
- Additional notes (optional)

Auto-suggest:
- Based on pending orders shortfall
- Example: "Need 150 USDT to fulfill 6,000,000 VES in pending orders"

Creates:
- New USDT request with status: PENDING
- Notification for Brian on main dashboard

User can:
- View pending requests
- View request history (approved/rejected)
```

---

## Example Scenarios

### Scenario 1: Complete VES Workflow with New Order System
```
Day 1:
- Brian buys 1000 USDT (4% fee = $1,040)
  Balance: Brian 1000 USDT

- Brian transfers 500 USDT to Dai
  Balance: Brian 500 USDT, Dai 500 USDT

Day 2:
- Dai converts 300 USDT → 12,000,000 VES (rate: 40,000)
  Balance: Brian 500 USDT, Dai 200 USDT + 12,000,000 VES

Day 3:
- Patty submits orders:
  * Customer A: 5,000,000 VES [PENDING]
  * Customer B: 3,000,000 VES [PENDING]
  
- Dai's dashboard shows:
  Pending Orders: 2
  Total VES Needed: 8,000,000 VES
  Your VES Balance: 12,000,000 VES
  Status: ✓ Sufficient balance
  
- Dai fulfills Customer A:
  * Exchange rate: 40,000 VES/USDT
  * USDT sold: 125 USDT (5,000,000 ÷ 40,000)
  * Status: PENDING → COMPLETED
  Balance: Dai 200 USDT + 7,000,000 VES
  
  Profit calculation (Brian's private view):
  - USDT sold: 125 USDT
  - Profit: 12.5 USDT

Day 4:
- Patty submits new order:
  * Customer C: 8,000,000 VES [PENDING]
  
- Dai's dashboard now shows:
  Pending Orders: 2 (Customer B + Customer C)
  Total VES Needed: 11,000,000 VES
  Your VES Balance: 7,000,000 VES
  ❌ SHORTFALL: 4,000,000 VES
  💡 Suggestion: Convert ~100 USDT at 40,000 rate
  
- Dai converts 100 USDT → 4,000,000 VES
  Balance: Dai 100 USDT + 11,000,000 VES
  
- Dai batch fulfills remaining orders (same rate: 40,000):
  * Customer B: 3,000,000 VES → 75 USDT sold [COMPLETED]
  * Customer C: 8,000,000 VES → 200 USDT sold [COMPLETED]
  Balance: Dai 100 USDT + 0 VES
  
  Total profit (Brian's private view):
  - USDT sold: 125 + 75 + 200 = 400 USDT
  - Total profit: 40 USDT
```

### Scenario 2: COP Workflow with Order System
```
Day 1:
- Patty submits COP orders:
  * Customer D: 2,000,000 COP [PENDING]
  * Customer E: 1,500,000 COP [PENDING]
  
- Brian's dashboard shows:
  Pending COP Orders: 2
  Total COP Needed: 3,500,000 COP
  
- Brian fulfills Customer D:
  * Exchange rate: 4,000 COP/USDT
  * USDT sold: 500 USDT (2,000,000 ÷ 4,000)
  * Status: PENDING → COMPLETED
  Balance: Brian 0 USDT, Dai 100 USDT + 0 VES
  
  Profit calculation (Private):
  - USDT sold: 500 USDT
  - Profit: 50 USDT
  - Total cumulative profit: 40 + 50 = 90 USDT

Day 2:
- Brian needs more USDT to fulfill Customer E
- Brian buys 500 USDT (3% fee = $515)
  Balance: Brian 500 USDT
  
- Brian fulfills Customer E:
  * Exchange rate: 4,100 COP/USDT
  * USDT sold: 365.85 USDT (1,500,000 ÷ 4,100)
  * Status: PENDING → COMPLETED
  Balance: Brian 134.15 USDT
  
  Updated profit (Private):
  - Additional USDT sold: 365.85 USDT
  - Additional profit: 36.59 USDT
  - Total profit: 126.59 USDT
  - Available: 126.59 USDT
```

### Scenario 3: Dairimar Requests USDT
```
Day 1:
- Dai's current balance: 50 USDT + 2,000,000 VES
  
- Patty submits large order:
  * Customer F: 10,000,000 VES [PENDING]
  
- Dai's dashboard shows:
  Pending Orders: 1
  Total VES Needed: 10,000,000 VES
  Your VES Balance: 2,000,000 VES
  ❌ SHORTFALL: 8,000,000 VES
  💡 Suggestion: Convert ~200 USDT at 40,000 rate
  
- Dai only has 50 USDT, not enough to convert
  
- Dai clicks "Request USDT from Brian"
  * Amount: 200 USDT
  * Reason: "Need to fulfill pending orders"
  * Auto-note: "Pending order requires 8,000,000 VES more"
  * Status: PENDING
  
- Brian sees notification on main dashboard:
  "💬 Dairimar requested 200 USDT - Pending orders"
  
- Brian transfers 200 USDT to Dai
  Balance: Brian (original - 200), Dai 250 USDT + 2,000,000 VES
  
- Dai converts 200 USDT → 8,000,000 VES
  Balance: Dai 50 USDT + 10,000,000 VES
  
- Dai fulfills Customer F:
  * Exchange rate: 40,000 VES/USDT
  * USDT sold: 250 USDT
  * Status: COMPLETED
  Balance: Dai 50 USDT + 0 VES
```

### Scenario 4: Profit Withdrawal
```
Current State:
- Total profit earned: 126.59 USDT
- Withdrawn: 0 USDT
- Available: 126.59 USDT

Brian logs in (sees private dashboard):
- Clicks "Withdraw Profit"
- Amount: 100 USDT
- Notes: "Personal expense"
- Confirms withdrawal

Updated profit view:
- Total profit earned: 126.59 USDT
- Withdrawn: 100 USDT
- Available: 26.59 USDT

Withdrawal history shows:
| Date | Amount | Balance After | Notes |
|------|--------|---------------|-------|
| 2024-XX-XX | 100 USDT | 26.59 USDT | Personal expense |
```

### Scenario 5: Patty Checks VES Availability Before Submitting
```
Patty's Dashboard shows:
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dairimar's VES Balance
8,500,000 VES
🟢 Available
━━━━━━━━━━━━━━━━━━━━━━━━━━

Customer calls Patty wanting 10,000,000 VES:
- Patty sees Dai only has 8,500,000 VES
- Patty can either:
  1. Submit order anyway (Dai will need to convert more USDT)
  2. Tell customer to wait while coordinating with Dai/Brian
  3. Split into two orders

Patty decides to submit:
- Customer G: 10,000,000 VES [PENDING]

This appears on:
- Patty's dashboard: Order submitted, status PENDING
- Dai's dashboard: Alert shows shortfall of 1,500,000 VES
- Main dashboard: Brian can see the pending order

Dai sees alert and converts 40 USDT → 1,600,000 VES
Then fulfills the order successfully.
```

---

## Technical Implementation Notes

### Frontend
- **Framework**: React, Vue, or vanilla JavaScript
- **UI Components**: 
  - Dashboard cards
  - Data tables with sorting/filtering
  - Forms with validation
  - Modal dialogs for actions
  - Login form (top right corner)
  - Conditional rendering based on auth state

### Backend/Data Storage
- **Options**: 
  - Local storage (browser-based, simple)
  - Database (PostgreSQL, MySQL, MongoDB for production)
  - Firebase/Supabase (quick setup with auth)

### Authentication
- **Simple approach**: Single admin password
- **Secure approach**: JWT tokens, session management
- **Storage**: Secure password hashing (bcrypt)

### Data Persistence
```
Tables/Collections needed:
1. purchases
2. transfers
3. conversions
4. ves_orders
5. cop_orders
6. withdrawals
7. usdt_requests (Dai → Brian)
8. users (for auth)
9. settings (exchange rates, thresholds)
```

### Key Calculations
```javascript
// Brian's USDT balance
brianBalance = totalPurchased - transferredToDai - soldCOP

// Dai's USDT balance
daiUSDTBalance = receivedFromBrian - convertedToVES

// Dai's VES balance
daiVESBalance = totalVESConverted - totalVESSold

// Total USDT sold (only completed orders)
totalSold = sum(completed_ves_orders.usdt_sold) + sum(completed_cop_orders.usdt_sold)

// Total profit (Private)
totalProfit = totalSold * 0.10

// Available profit (Private)
availableProfit = totalProfit - totalWithdrawn

// Pending VES needed
pendingVESNeeded = sum(pending_ves_orders.amount)

// VES shortfall/sufficient
vesShortfall = pendingVESNeeded - daiVESBalance
// If negative, sufficient; if positive, shortfall
```

### Security Considerations
- Profit data only accessible after authentication
- Secure password storage (bcrypt, Argon2)
- HTTPS for production (Let's Encrypt with Certbot)
- Input validation and sanitization
- Rate limiting on login attempts
- Session timeout
- CORS configuration for subdomains
- SQL injection prevention (parameterized queries)
- XSS protection

### Docker Deployment (Recommended)

#### Why Docker?
- ✅ Easy deployment and updates
- ✅ Isolated environment
- ✅ Easy to replicate/backup
- ✅ Simple SSL certificate management with Nginx proxy
- ✅ Consistent across development and production
- ✅ Easy rollback if issues occur

#### Docker Architecture
```
VPS Server
├── Docker Host
│   ├── Nginx Proxy Container (port 80, 443)
│   │   ├── powermental.vps.xxxx → Main App
│   │   ├── pato.vps.xxxx → Patty's Dashboard
│   │   └── dai.vps.xxxx → Dairimar's Dashboard
│   ├── Web Application Container (Node.js/Python)
│   ├── Database Container (PostgreSQL/MySQL)
│   └── Redis Container (optional - for sessions/cache)
```

#### Docker Compose Structure
```yaml
version: '3.8'

services:
  nginx-proxy:
    image: jwilder/nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./vhost:/etc/nginx/vhost.d
      - ./html:/usr/share/nginx/html
    restart: always

  letsencrypt:
    image: jrcs/letsencrypt-nginx-proxy-companion
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./vhost:/etc/nginx/vhost.d
      - ./html:/usr/share/nginx/html
    depends_on:
      - nginx-proxy
    restart: always

  web-app:
    build: ./app
    environment:
      - VIRTUAL_HOST=powermental.vps.xxxx,pato.vps.xxxx,dai.vps.xxxx
      - LETSENCRYPT_HOST=powermental.vps.xxxx,pato.vps.xxxx,dai.vps.xxxx
      - LETSENCRYPT_EMAIL=your-email@example.com
      - DATABASE_URL=postgresql://user:pass@db:5432/usdt_exchange
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: always

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=usdt_exchange
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

volumes:
  postgres-data:
```

#### Application Routing (Within Web App)
```javascript
// Express.js example
app.use((req, res, next) => {
  const host = req.get('host');
  
  if (host.startsWith('powermental.')) {
    req.subdomain = 'main';
  } else if (host.startsWith('pato.')) {
    req.subdomain = 'patty';
  } else if (host.startsWith('dai.')) {
    req.subdomain = 'dairimar';
  }
  
  next();
});

// Route to appropriate dashboard
app.get('/', (req, res) => {
  switch(req.subdomain) {
    case 'patty':
      return res.render('patty-dashboard');
    case 'dairimar':
      return res.render('dairimar-dashboard');
    default:
      return res.render('main-dashboard');
  }
});
```

#### Deployment Steps
1. **Prepare VPS**:
   ```bash
   # Install Docker and Docker Compose
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

2. **Clone Repository**:
   ```bash
   git clone https://github.com/your-repo/usdt-exchange.git
   cd usdt-exchange
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   nano .env
   ```

4. **Start Services**:
   ```bash
   docker-compose up -d
   ```

5. **Check Logs**:
   ```bash
   docker-compose logs -f
   ```

6. **SSL Certificates**:
   - Let's Encrypt will automatically generate SSL certificates
   - Certificates auto-renew

#### Backup Strategy
```bash
# Database backup
docker-compose exec db pg_dump -U user usdt_exchange > backup.sql

# Full backup (automated with cron)
0 2 * * * cd /path/to/app && docker-compose exec db pg_dump -U user usdt_exchange > /backups/usdt-$(date +\%Y\%m\%d).sql
```

#### Update/Deployment Process
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Or zero-downtime with:
docker-compose up -d --build --no-deps web-app
```

#### Monitoring
```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Application logs
docker-compose logs -f web-app

# Database logs
docker-compose logs -f db
```

### Alternative: Non-Docker Deployment
If you prefer not to use Docker:
- Install Node.js/Python directly on VPS
- Install PostgreSQL/MySQL
- Use PM2 for process management
- Configure Nginx manually for subdomains
- Use Certbot for SSL certificates

Docker is still highly recommended for easier maintenance and deployment.

---

## Future Enhancements

### Phase 2 Features
- [ ] **Notifications System**
  - Email/SMS notifications for low balances
  - Push notifications for pending orders
  - Alerts when Dai requests USDT
  - Daily summary emails for Brian
- [ ] **Real-time Updates**
  - WebSocket integration for live balance updates
  - Real-time order status changes
  - Live notifications across all dashboards
- [ ] **Enhanced Analytics**
  - Charts and graphs for trends
  - Profit trends over time
  - Exchange rate history visualization
  - Volume analysis (daily/weekly/monthly)
- [ ] **Export & Reports**
  - PDF reports generation
  - Excel export for accounting
  - Monthly/quarterly summaries
  - Tax reporting documents
- [ ] **Multi-currency Support**
  - Add more currencies beyond VES and COP
  - Currency-specific dashboards
  - Cross-currency analytics
- [ ] **Customer Database**
  - Customer profiles with history
  - Repeat customer tracking
  - Customer loyalty analytics
  - Contact information management
- [ ] **Mobile App**
  - Native iOS/Android apps
  - Push notifications
  - Offline mode with sync
  - Biometric authentication
- [ ] **Advanced User Roles**
  - Granular permissions for Dai and Patty
  - Login for Dai and Patty (currently subdomain-based)
  - Activity logs per user
  - Role-based feature access

### Phase 3 - Advanced Features
- [ ] **API Integration**
  - Bybit API integration for automated order placement
  - Real-time exchange rate fetching
  - Automated USDT purchases
  - Webhook support for external systems
- [ ] **Automated Calculations**
  - Auto-suggest optimal USDT conversion amounts
  - Predictive inventory management
  - Smart order routing
  - Exchange rate alerts
- [ ] **Communication Tools**
  - WhatsApp/Telegram bot integration
  - In-app messaging between Brian, Dai, and Patty
  - Quick status updates via chat
  - Order status notifications via messaging
- [ ] **Compliance & Audit**
  - Complete audit trail for all transactions
  - Regulatory compliance reports
  - Transaction verification system
  - Automated compliance checks
- [ ] **Performance Optimization**
  - Caching for frequently accessed data
  - Database query optimization
  - CDN for static assets
  - Load balancing for high traffic
- [ ] **Backup & Recovery**
  - Automated daily backups
  - Point-in-time recovery
  - Disaster recovery plan
  - Data redundancy across regions

### Subdomain-Specific Enhancements

#### `powermental.vps.xxxx` (Main)
- [ ] Admin panel for system settings
- [ ] User management (add/remove Dai, Patty)
- [ ] System-wide configuration
- [ ] Advanced reporting and analytics
- [ ] Bulk operations (batch transfers, etc.)

#### `pato.vps.xxxx` (Patty)
- [ ] Customer contact management
- [ ] Order templates for repeat customers
- [ ] Quick order submission (saved customer profiles)
- [ ] Performance metrics (orders submitted, completion rate)
- [ ] Commission tracking (if applicable)

#### `dai.vps.xxxx` (Dairimar)
- [ ] Conversion scheduler (plan conversions in advance)
- [ ] Exchange rate alerts (notify when rate reaches target)
- [ ] Order prioritization (flag urgent orders)
- [ ] Batch operations (fulfill multiple orders at once)
- [ ] Performance dashboard (fulfillment speed, accuracy)

---

## Support & Maintenance

### Regular Tasks
- Daily: Check balances, process pending orders
- Daily: Monitor pending VES/COP orders
- Weekly: Review profit and withdrawal history
- Weekly: Check for pending USDT requests from Dai
- Monthly: Generate performance reports
- Monthly: Backup database
- As needed: Update exchange rate alerts, adjust thresholds

### Backup Strategy
- Automated daily database backups (via Docker cron or VPS cron)
- Weekly full system backups
- Export transaction history monthly
- Secure offsite storage of financial records
- Test restore procedures quarterly

### Monitoring Checklist
- [ ] All three subdomains accessible
- [ ] SSL certificates valid and auto-renewing
- [ ] Database connections healthy
- [ ] No pending orders stuck in queue
- [ ] Balance calculations accurate
- [ ] No error logs or exceptions
- [ ] Disk space sufficient
- [ ] Memory and CPU usage normal

---

## DNS Configuration for Subdomains

### Required DNS Records
Point all three subdomains to your VPS IP address:

```
Type: A Record
Host: powermental
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600

Type: A Record
Host: pato
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600

Type: A Record
Host: dai
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600
```

### Example Configuration (for domain: vps.xxxx)
```
powermental.vps.xxxx → 123.456.789.0
pato.vps.xxxx → 123.456.789.0
dai.vps.xxxx → 123.456.789.0
```

### SSL Certificate (Let's Encrypt)
With Docker setup (nginx-proxy + letsencrypt companion):
- Certificates are automatically generated for all three subdomains
- Auto-renewal every 60 days
- No manual configuration needed

Without Docker:
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificates for all subdomains
sudo certbot --nginx -d powermental.vps.xxxx -d pato.vps.xxxx -d dai.vps.xxxx

# Auto-renewal (test)
sudo certbot renew --dry-run
```

---

## Project Summary

### System Overview
A multi-subdomain USDT exchange tracking system with role-based dashboards for three users:
- **Brian (Owner)**: Full control, profit tracking, COP order fulfillment
- **Dairimar (VES Handler)**: Balance management, VES order fulfillment, USDT requests
- **Patty (Sales)**: Customer order submission for both VES and COP

### Key Features
✅ Real-time balance tracking (USDT, VES)  
✅ Order management system (PENDING → COMPLETED workflow)  
✅ Exchange rate tracking for accurate profit calculation  
✅ Private profit dashboard with withdrawal management  
✅ Smart pending order alerts with auto-calculations  
✅ USDT request system (Dai → Brian)  
✅ Multi-subdomain architecture for role-based access  
✅ Docker deployment for easy management  

### Technology Stack (Recommended)
- **Frontend**: React or Vue.js
- **Backend**: Node.js (Express) or Python (FastAPI/Django)
- **Database**: PostgreSQL
- **Cache/Sessions**: Redis (optional)
- **Web Server**: Nginx (reverse proxy)
- **Deployment**: Docker + Docker Compose
- **SSL**: Let's Encrypt (automated)
- **VPS**: Ubuntu 22.04 LTS

### Security Features
🔒 Password-protected profit dashboard  
🔒 HTTPS/SSL for all subdomains  
🔒 Input validation and sanitization  
🔒 Rate limiting on authentication  
🔒 Secure session management  
🔒 SQL injection prevention  

### Business Value
💰 Accurate profit tracking with 10% margin calculation  
📊 Real-time inventory management (VES availability)  
⚡ Efficient order workflow (PENDING/COMPLETED status)  
📈 Data-driven decisions with balance alerts  
🤝 Clear role separation for team efficiency  
🔄 Scalable architecture for future growth  

---

## Notes
- All currency amounts should be stored with appropriate decimal precision (use DECIMAL type in database, not FLOAT)
- Exchange rates should be stored with each transaction for historical accuracy
- Timestamps should use UTC for consistency across timezones
- Consider adding a "notes" field to transactions for additional context
- Keep comprehensive audit logs for all financial operations (especially in private dashboard)
- Order IDs should be unique and sequential for easy tracking
- Consider implementing soft deletes (mark as deleted, don't actually delete) for data integrity
- Use database transactions for operations that modify multiple tables (e.g., fulfilling an order)
- Implement idempotency for critical operations to prevent duplicate submissions
- Rate limiting should be aggressive on login endpoints to prevent brute force attacks

---

## Getting Started

### Development Setup
1. Clone repository
2. Install dependencies
3. Configure environment variables
4. Set up local database
5. Run migrations
6. Start development server
7. Access via localhost with subdomain simulation

### Production Deployment
1. Purchase VPS (Ubuntu 22.04 recommended)
2. Configure DNS records for subdomains
3. Install Docker and Docker Compose
4. Clone repository to VPS
5. Configure production environment variables
6. Run `docker-compose up -d`
7. SSL certificates auto-generate
8. Access dashboards via subdomains

### First-Time Setup
1. Access `powermental.vps.xxxx`
2. Create admin account (Brian)
3. Set initial settings (thresholds, default rates)
4. Add first USDT purchase
5. Share subdomain URLs with Dai and Patty
6. Train team on their respective dashboards

---

**Version**: 2.0  
**Last Updated**: December 2025  
**Created for**: Brian's USDT Exchange Service  
**Architecture**: Multi-subdomain with Docker deployment