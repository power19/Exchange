# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**USDT Exchange Service Tracking System** - A multi-subdomain web application for managing cryptocurrency exchange operations across three user roles: Brian (Owner), Dairimar (VES Handler), and Patty (Customer Acquisition).

**Complete business requirements**: See `REQUIREMENTS.md` for detailed specifications, workflows, and feature descriptions.

## Architecture Overview

### Multi-Subdomain Structure

The system is deployed as **three separate dashboards** on the same application, differentiated by subdomain:

- `powermental.vps.xxxx` - **Main Dashboard** (Brian's full-access interface)
- `pato.vps.xxxx` - **Patty's Dashboard** (order submission only)
- `dai.vps.xxxx` - **Dairimar's Dashboard** (VES management and fulfillment)

### Key Architectural Decisions

1. **Single Application, Multiple Views**: One web app serves all three subdomains, routing based on `Host` header
2. **Calculated Balances**: All balances (USDT, VES) are computed from transaction history - never stored separately
3. **Order Status Workflow**: Orders start as `PENDING` (submitted by Patty) → `COMPLETED` (fulfilled by Dai/Brian with exchange rate)
4. **Privacy Layer**: Profit calculations visible only after authentication on main subdomain
5. **Docker-First Deployment**: Designed for containerized deployment with nginx-proxy and automated SSL

## Technology Stack

### Backend (Implemented)
- **Node.js + Express + TypeScript**
- **PostgreSQL** for data persistence
- **JWT** for authentication
- **bcrypt** for password hashing
- **helmet** + **cors** for security

### Frontend (Implemented)
- **React + TypeScript**
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **React Router** for routing (with fallback subdomain detection)
- **Axios** for API communication

### Deployment
- **Docker + Docker Compose** (see `REQUIREMENTS.md` lines 1092-1286)
- **nginx-proxy** for subdomain routing
- **Let's Encrypt** for SSL via letsencrypt-nginx-proxy-companion

## Code Architecture

### Backend Structure

```
backend/src/
├── index.ts                  # Express app entry point
├── types/index.ts            # TypeScript interfaces
├── database/
│   ├── connection.ts         # PostgreSQL connection pool
│   ├── migrate.ts            # Database migration runner
│   └── schema.sql            # Complete DB schema
├── middleware/
│   ├── subdomain.ts          # Subdomain detection (sets req.userRole)
│   ├── auth.ts               # JWT authentication middleware
│   └── errorHandler.ts       # Global error handler
├── services/
│   └── balanceService.ts     # ALL balance calculations (critical!)
├── routes/
│   ├── index.ts              # Main API router aggregator
│   ├── auth.ts               # Login endpoint
│   ├── balances.ts           # Balance queries (uses BalanceService)
│   ├── purchases.ts          # USDT purchase transactions
│   ├── transfers.ts          # Brian → Dairimar transfers
│   ├── conversions.ts        # USDT → VES conversions
│   ├── vesOrders.ts          # VES order submission/fulfillment
│   ├── copOrders.ts          # COP order submission/fulfillment
│   └── withdrawals.ts        # Profit withdrawal (protected)
└── scripts/
    └── createAdmin.ts        # Admin user creation utility
```

### Frontend Structure

```
frontend/src/
├── App.tsx                   # Router + subdomain detection logic
├── main.tsx                  # Vite entry point
├── pages/
│   ├── MainDashboard.tsx     # Brian's full dashboard
│   ├── PattyDashboard.tsx    # Order submission interface
│   └── DairimarDashboard.tsx # VES management interface
├── components/               # Reusable UI components
├── services/                 # API client functions
├── hooks/                    # Custom React hooks
├── types/                    # TypeScript interfaces (match backend)
└── utils/                    # Helper functions
```

### Critical Implementation Details

**Subdomain Routing**:
- Backend: `middleware/subdomain.ts` sets `req.userRole` based on `Host` header
- Frontend: `App.tsx` uses `window.location.hostname` to show correct dashboard
- Development fallback: `localhost` routes to main dashboard; use `/patty` and `/dairimar` routes

**Balance Calculations**:
- **NEVER query balance tables** - they don't exist!
- ALL balance logic is in `services/balanceService.ts`
- Each balance is calculated from transaction history using SQL aggregations
- See `balanceService.ts:9-205` for implementation details

**Order Fulfillment**:
- Frontend sends only `exchange_rate` when fulfilling
- Backend calculates `usdt_sold = amount ÷ exchange_rate` automatically
- Backend validates sufficient balances before committing
- Uses database transactions to ensure atomicity

## Core Business Logic

### Balance Calculations

**Critical**: All balances must be calculated from transaction history, not stored in separate fields.

```javascript
// Brian's USDT balance
brianBalance = sum(purchases.amount)
             - sum(transfers.amount)
             - sum(completed_cop_orders.usdt_sold)

// Dairimar's USDT balance
daiUSDTBalance = sum(transfers.amount)
               - sum(conversions.usdt_amount)

// Dairimar's VES balance
daiVESBalance = sum(conversions.ves_received)
              - sum(completed_ves_orders.amount)

// Total USDT Sold (for profit)
totalSold = sum(completed_ves_orders.usdt_sold)
          + sum(completed_cop_orders.usdt_sold)

// Profit (Private - Brian only)
totalProfit = totalSold * 0.10
availableProfit = totalProfit - sum(withdrawals.amount)

// Pending VES Alert
pendingVESNeeded = sum(pending_ves_orders.amount)
vesShortfall = pendingVESNeeded - daiVESBalance  // negative = sufficient
```

### Order Workflow

**VES Orders**:
1. Patty submits order → Status: `PENDING`, visible on `dai.vps.xxxx` and `powermental.vps.xxxx`
2. Dairimar fulfills → Adds exchange rate → Status: `COMPLETED`
3. System calculates: `usdt_sold = ves_amount ÷ exchange_rate`
4. Updates Dai's VES balance and total profit

**COP Orders**:
1. Patty submits order → Status: `PENDING`, visible on `powermental.vps.xxxx` only
2. Brian fulfills → Adds exchange rate → Status: `COMPLETED`
3. System calculates: `usdt_sold = cop_amount ÷ exchange_rate`
4. Updates Brian's USDT balance and total profit

### Transaction Types

Six types of transactions to implement:

1. **purchases** - Brian buys USDT (includes fee %)
2. **transfers** - Brian → Dairimar USDT
3. **conversions** - Dairimar converts USDT → VES
4. **ves_orders** - Customer orders (status: PENDING/COMPLETED)
5. **cop_orders** - Customer orders (status: PENDING/COMPLETED)
6. **withdrawals** - Brian withdraws profit (private)

## Data Precision Requirements

**Critical for financial accuracy**:

- **USDT amounts**: `DECIMAL(10, 2)` - e.g., 1000.50
- **VES amounts**: `BIGINT` - no decimals, large numbers (e.g., 40,000,000)
- **COP amounts**: `INTEGER` - no decimals (e.g., 2,000,000)
- **Exchange rates**: `DECIMAL(10, 2)` - e.g., 40000.00 VES/USDT, 4000.00 COP/USDT
- **Fee percentages**: `DECIMAL(5, 4)` - stored as decimal (0.0400 for 4%)
- **Timestamps**: Always use UTC

## Database Schema

### Core Tables

```sql
-- purchases
id, date, amount_usdt, fee_percentage, total_cost_usd, status

-- transfers
id, date, amount_usdt, brian_balance_after, dai_balance_after

-- conversions
id, date, usdt_amount, ves_received, exchange_rate, dai_usdt_after, dai_ves_after

-- ves_orders
id, date_submitted, customer_name, amount_ves, status, exchange_rate, usdt_sold,
date_completed, dai_ves_after

-- cop_orders
id, date_submitted, customer_name, amount_cop, status, exchange_rate, usdt_sold,
date_completed, brian_usdt_after

-- withdrawals (private)
id, date, amount_usdt, balance_after, notes

-- usdt_requests (Dai → Brian)
id, date_requested, amount_usdt, reason, status, date_resolved, notes
```

## API Structure

All API endpoints are under `/api` prefix. The backend is stateless REST API (no session cookies).

### Public Endpoints (No Auth Required)
```
GET  /health                           # Health check
GET  /api/balances                     # Get all balances
GET  /api/balances/ves-shortfall       # Get VES shortfall info
POST /api/auth/login                   # Login (returns JWT token)
GET  /api/purchases                    # List all USDT purchases
GET  /api/transfers                    # List all transfers
GET  /api/conversions                  # List all conversions
GET  /api/ves-orders?status=PENDING    # List VES orders (optional status filter)
GET  /api/cop-orders?status=PENDING    # List COP orders (optional status filter)
POST /api/purchases                    # Create USDT purchase
POST /api/transfers                    # Transfer USDT to Dairimar
POST /api/conversions                  # Convert USDT to VES
POST /api/ves-orders                   # Submit VES order
POST /api/cop-orders                   # Submit COP order
POST /api/ves-orders/:id/fulfill       # Fulfill VES order
POST /api/cop-orders/:id/fulfill       # Fulfill COP order
```

### Protected Endpoints (Require JWT Token)
```
GET  /api/balances/profit              # Get profit data (PRIVATE)
GET  /api/withdrawals                  # List profit withdrawals
POST /api/withdrawals                  # Create profit withdrawal
```

**Authentication**: Send JWT token in `Authorization` header:
```bash
Authorization: Bearer <token>
```

**Note**: While most endpoints are public, profit-related data is protected. In production, consider adding authentication to all endpoints and implementing role-based access control.

## Subdomain Routing

### Backend Implementation (middleware/subdomain.ts)

```javascript
app.use((req, res, next) => {
  const host = req.get('host');

  if (host.startsWith('powermental.')) {
    req.userRole = 'brian';
  } else if (host.startsWith('pato.')) {
    req.userRole = 'patty';
  } else if (host.startsWith('dai.')) {
    req.userRole = 'dairimar';
  }

  next();
});
```

**Note**: The `userRole` is currently set but not enforced by the backend. Data access control is handled by frontend view logic. For production, consider adding backend role-based filtering.

## Security Requirements

**Critical - Do not skip**:

1. **Profit Protection**: Profit data must NEVER be exposed without authentication
2. **Authentication**: Password-protected access for Brian's private dashboard features
3. **HTTPS/SSL**: All subdomains must use HTTPS (automated with Let's Encrypt)
4. **Input Validation**: Validate all amounts, rates, and user inputs
5. **SQL Injection Prevention**: Use parameterized queries exclusively
6. **XSS Protection**: Sanitize all outputs
7. **Rate Limiting**: Apply to login endpoints
8. **Session Management**: Implement secure session timeout

## Validation Rules

**Must enforce on all transactions**:

1. **Transfer to Dairimar**: `amount ≤ Brian's current balance`
2. **USDT → VES Conversion**: `amount ≤ Dai's current USDT balance`
3. **VES Order Fulfillment**: `ves_amount ≤ Dai's current VES balance`
4. **COP Order Fulfillment**: `calculated_usdt ≤ Brian's current USDT balance`
5. **Profit Withdrawal**: `amount ≤ Available profit`
6. **Exchange Rates**: Must be `> 0`
7. **Amounts**: Must be `> 0`

## Dashboard-Specific Features

### `powermental.vps.xxxx` (Main - Brian)

**Public View** (no login):
- All balances (Brian's USDT, Dai's USDT/VES)
- All transaction history
- Pending orders (VES + COP)
- Actions: Buy USDT, Transfer to Dai, Fulfill COP orders

**Private View** (after login):
- Everything above PLUS:
- Profit overview (Total, Available, Withdrawn)
- Profit breakdown (VES vs COP)
- Withdraw profit functionality
- Withdrawal history
- Business performance metrics

### `pato.vps.xxxx` (Patty)

**Always visible**:
- Dairimar's VES balance (to know availability)
- Submit new VES order form
- Submit new COP order form
- Her submitted orders with status
- Order history

**Cannot see**: Brian's balance, profit, purchase/transfer history

### `dai.vps.xxxx` (Dairimar)

**Always visible**:
- Her USDT balance
- Her VES balance
- **Pending VES orders queue** with smart alerts:
  - Total VES needed vs current balance
  - Shortfall calculation: "Need 5M more VES"
  - Auto-suggestion: "Convert ~125 USDT at 40,000 rate"
- Convert USDT → VES form
- Fulfill VES orders (add exchange rate)
- Request USDT from Brian
- Conversion and fulfillment history

**Cannot see**: Brian's balance, COP orders, profit, purchases

## Smart Features to Implement

### 1. Pending Orders Alert (Dairimar's Dashboard)

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
```

### 2. Batch Fulfill Orders

Allow Dairimar to fulfill multiple orders with the same exchange rate in one action.

### 3. Auto-Calculate USDT Sold

When fulfilling orders, automatically calculate `usdt_sold = amount ÷ exchange_rate` and show before confirming.

## Development Workflow

### When Starting Implementation

1. **Set up database schema** with proper decimal types
2. **Implement balance calculation functions** (test thoroughly)
3. **Build subdomain routing** in Express/FastAPI
4. **Create transaction management** with validation
5. **Implement order workflow** (PENDING → COMPLETED)
6. **Add authentication** for Brian's private dashboard
7. **Build three dashboard views** with appropriate data visibility
8. **Docker setup** with nginx-proxy and SSL
9. **Deploy to VPS** with subdomain DNS configuration

### Critical Testing Scenarios

**Important**: Currently no automated tests. Manual testing required.

Test these workflows (see `REQUIREMENTS.md` lines 822-1010):
- Complete VES workflow with pending orders
- COP workflow with Brian fulfillment
- Dairimar's USDT request process
- Profit withdrawal
- Patty submitting orders while checking VES availability
- Balance shortfall alerts and suggestions

**Key validation checks to test**:
- Transfer validation: Cannot transfer more USDT than Brian has
- Conversion validation: Dai cannot convert more USDT than she has
- VES fulfillment: Cannot fulfill if insufficient VES balance
- COP fulfillment: Cannot fulfill if Brian has insufficient USDT
- Profit withdrawal: Cannot withdraw more than available profit
- All amounts and rates must be > 0

## Docker Deployment

See `REQUIREMENTS.md` lines 1092-1286 for complete Docker Compose setup including:
- nginx-proxy for subdomain routing
- letsencrypt-nginx-proxy-companion for SSL
- PostgreSQL container
- Redis container (optional)
- Application container with environment variables

**Key environment variables**:
```bash
# Backend (.env)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:postgres123@db:5432/usdt_exchange
JWT_SECRET=your-secure-secret-key-here
ADMIN_PASSWORD=your-secure-admin-password
CORS_ORIGINS=*

# Production with nginx-proxy
VIRTUAL_HOST=powermental.vps.xxxx,pato.vps.xxxx,dai.vps.xxxx
LETSENCRYPT_HOST=powermental.vps.xxxx,pato.vps.xxxx,dai.vps.xxxx
LETSENCRYPT_EMAIL=your-email@example.com
```

**Local development**: Copy `.env.example` to `.env` and adjust `DATABASE_URL` to point to your local PostgreSQL instance.

## Common Pitfalls to Avoid

1. **Never store balances separately** - always calculate from transactions
2. **Never expose profit data** without authentication
3. **Never use FLOAT** for currency - use DECIMAL
4. **Never complete orders without exchange rates** - they're required for profit tracking
5. **Never allow negative balances** - validate before committing
6. **Always store exchange rates with transactions** - critical for historical accuracy
7. **Use database transactions** for multi-table operations (e.g., fulfilling orders)
8. **Implement idempotency** to prevent duplicate order submissions

## Quick File Reference

When working on specific features, start with these files:

**Adding/Fixing Balance Logic**:
- `backend/src/services/balanceService.ts` - ALL balance calculations
- `backend/src/routes/balances.ts` - Balance API endpoints

**Adding New Transaction Type**:
1. Add table to `backend/src/database/schema.sql`
2. Add route in `backend/src/routes/`
3. Update balance calculations in `balanceService.ts`
4. Add TypeScript types in `backend/src/types/index.ts`

**Modifying Dashboard Views**:
- `frontend/src/pages/MainDashboard.tsx` - Brian's dashboard
- `frontend/src/pages/PattyDashboard.tsx` - Patty's dashboard
- `frontend/src/pages/DairimarDashboard.tsx` - Dairimar's dashboard

**Authentication Changes**:
- `backend/src/routes/auth.ts` - Login logic
- `backend/src/middleware/auth.ts` - JWT verification
- `backend/src/scripts/createAdmin.ts` - User creation

**Subdomain Routing**:
- `backend/src/middleware/subdomain.ts` - Backend subdomain detection
- `frontend/src/App.tsx` - Frontend subdomain routing

**Database Schema**:
- `backend/src/database/schema.sql` - Complete schema (single source of truth)
- `backend/src/database/migrate.ts` - Migration runner

## Reference Documentation

- **Complete Requirements**: `REQUIREMENTS.md`
- **Business Workflows**: `REQUIREMENTS.md` lines 31-83
- **Dashboard Specifications**: `REQUIREMENTS.md` lines 86-592
- **Data Structures**: `REQUIREMENTS.md` lines 239-326
- **User Actions**: `REQUIREMENTS.md` lines 594-819
- **Example Scenarios**: `REQUIREMENTS.md` lines 822-1010
- **Docker Deployment**: `REQUIREMENTS.md` lines 1092-1286
- **DNS Configuration**: `REQUIREMENTS.md` lines 1419-1464

## Quick Command Reference

### Docker (Recommended for Production)

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Database backup
docker-compose exec db pg_dump -U postgres usdt_exchange > backup.sql
```

### Local Development

#### Backend
```bash
cd backend

# Install dependencies
npm install

# Setup database (run migrations + create admin user)
npm run setup

# Or run individually:
npm run migrate        # Run database migrations (REQUIRED before first run)
npm run create-admin   # Create admin user

# Start development server (runs TypeScript directly with hot reload)
npm run dev

# Build for production (compiles TypeScript to dist/)
npm run build
npm start

# Note: Migration must run before backend starts, or you'll get "relation does not exist" errors
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Operations

```bash
# Create admin user (local development)
cd backend
npm run create-admin

# Access PostgreSQL (Docker)
docker-compose exec db psql -U postgres -d usdt_exchange

# Run SQL query
docker-compose exec db psql -U postgres -d usdt_exchange -c "SELECT * FROM purchases;"

# Backup database
docker-compose exec db pg_dump -U postgres usdt_exchange > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T db psql -U postgres -d usdt_exchange < backup.sql
```

### Useful Development Commands

```bash
# Check backend API health
curl http://localhost:3000/health

# Get balances
curl http://localhost:3000/api/balances

# Login (get token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Check Docker container status
docker-compose ps

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## Common Development Issues

### TypeScript Build Errors

**Backend**: If you see TypeScript errors, make sure types are properly imported:
```typescript
import { Request, Response } from 'express';
import { UserRole } from '../types';
```

**Frontend**: Vite requires explicit type imports:
```typescript
import type { Balances } from '../types';
```

### Database Migration Issues

**Problem**: Migration fails or tables don't exist
**Solution**:
```bash
cd backend
npm run migrate
# Or in Docker:
docker-compose exec backend npm run migrate
```

**Problem**: "relation does not exist" errors
**Cause**: Database schema not applied
**Solution**: Run migrations first, then restart backend

### Subdomain Testing in Development

**Problem**: Can't test subdomain routing locally
**Solutions**:
1. Use route-based navigation: `/patty`, `/dairimar`, `/main`
2. Edit `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```
   127.0.0.1 pato.localhost
   127.0.0.1 dai.localhost
   127.0.0.1 powermental.localhost
   ```
   Then access via `http://pato.localhost:5173`

### Balance Calculation Debugging

If balances seem incorrect, check `balanceService.ts` logic:
```bash
# Test balance queries directly
docker-compose exec db psql -U postgres -d usdt_exchange

# Check individual aggregations
SELECT COALESCE(SUM(amount_usdt), 0) as total FROM purchases;
SELECT COALESCE(SUM(amount_usdt), 0) as total FROM transfers;
SELECT COALESCE(SUM(usdt_sold), 0) as total FROM ves_orders WHERE status = 'COMPLETED';
```

### Authentication Issues

**Problem**: "Invalid token" or 401 errors
**Cause**: Token expired or JWT_SECRET changed
**Solution**:
1. Login again to get new token
2. Check JWT_SECRET is consistent across restarts
3. Token expires after set time (check middleware/auth.ts)

**Problem**: Can't create admin user
**Solution**:
```bash
cd backend
npm run create-admin
# Or use the direct script in backend/src/scripts/createAdmin.ts
```

### CORS Errors

**Problem**: Frontend can't connect to backend API
**Solution**: Check CORS_ORIGINS in backend `.env`:
```bash
# Development: Allow all
CORS_ORIGINS=*

# Production: Specify domains
CORS_ORIGINS=https://powermental.vps.xxxx,https://pato.vps.xxxx,https://dai.vps.xxxx
```
