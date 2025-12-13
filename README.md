# USDT Exchange Service Tracking System

A multi-subdomain web application for managing cryptocurrency exchange operations across three user roles: Brian (Owner), Dairimar (VES Handler), and Patty (Customer Acquisition).

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL
- **Deployment**: Docker + Docker Compose

## Features

- ✅ Real-time balance tracking (USDT, VES)
- ✅ Order management system (PENDING → COMPLETED workflow)
- ✅ Exchange rate tracking for accurate profit calculation
- ✅ Private profit dashboard with withdrawal management
- ✅ Smart pending order alerts with auto-calculations
- ✅ Multi-subdomain architecture for role-based access

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)

### Running with Docker (Recommended)

1. **Clone the repository**
   ```bash
   cd Exchange
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and set your JWT_SECRET and ADMIN_PASSWORD
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Create admin user**
   ```bash
   # Connect to backend container
   docker exec -it usdt-exchange-backend sh

   # Run Node.js to create admin user
   node -e "
   const bcrypt = require('bcrypt');
   const { Pool } = require('pg');
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });

   (async () => {
     const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
     await pool.query(
       'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET password_hash = $2',
       ['admin', hash, 'admin']
     );
     console.log('Admin user created/updated!');
     process.exit(0);
   })();
   "
   ```

5. **Access the application**
   - Main Dashboard (Brian): http://localhost
   - Patty's Dashboard: http://localhost/patty
   - Dairimar's Dashboard: http://localhost/dairimar

### Local Development

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL (you need PostgreSQL running locally)
# Update DATABASE_URL in .env to point to your local PostgreSQL

# Run migrations
npm run migrate

# Start development server
npm run dev
```

The backend will run on http://localhost:3000

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on http://localhost:5173

## Project Structure

```
Exchange/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── database/       # Database connection and migrations
│   │   ├── middleware/     # Express middleware (auth, subdomain, etc.)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (balance calculations)
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Main entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/          # Dashboard pages
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API client
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx        # Main entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml       # Docker orchestration
├── CLAUDE.md               # Technical documentation for Claude Code
├── REQUIREMENTS.md         # Business requirements
└── README.md               # This file
```

## API Endpoints

### Public Endpoints

- `GET /api/balances` - Get all balances
- `GET /api/balances/ves-shortfall` - Get VES shortfall info
- `POST /api/auth/login` - Login
- `GET /api/purchases` - Get all purchases
- `GET /api/transfers` - Get all transfers
- `GET /api/conversions` - Get all conversions
- `GET /api/ves-orders` - Get VES orders (filter by status)
- `GET /api/cop-orders` - Get COP orders (filter by status)

### Protected Endpoints (Require Authentication)

- `GET /api/balances/profit` - Get profit data (Brian only)
- `GET /api/withdrawals` - Get withdrawal history
- `POST /api/withdrawals` - Create profit withdrawal

### Transaction Endpoints

- `POST /api/purchases` - Create USDT purchase
- `POST /api/transfers` - Transfer USDT to Dairimar
- `POST /api/conversions` - Convert USDT to VES
- `POST /api/ves-orders` - Submit VES customer order
- `POST /api/cop-orders` - Submit COP customer order
- `POST /api/ves-orders/:id/fulfill` - Fulfill VES order
- `POST /api/cop-orders/:id/fulfill` - Fulfill COP order

## Database Schema

The application uses PostgreSQL with the following tables:

- `purchases` - USDT purchase records
- `transfers` - Brian → Dairimar transfers
- `conversions` - USDT → VES conversions
- `ves_orders` - VES customer orders
- `cop_orders` - COP customer orders
- `withdrawals` - Profit withdrawals (private)
- `usdt_requests` - USDT requests (Dai → Brian)
- `users` - Authentication users

See `backend/src/database/schema.sql` for the complete schema.

## Key Business Logic

### Balance Calculations

All balances are calculated from transaction history:

```javascript
// Brian's USDT balance
brianBalance = totalPurchased - transferredToDai - soldCOP

// Dairimar's USDT balance
daiUSDTBalance = receivedFromBrian - convertedToVES

// Dairimar's VES balance
daiVESBalance = totalVESConverted - totalVESSold

// Profit (Private - Brian only)
totalProfit = totalUSDTSold * 0.10
availableProfit = totalProfit - totalWithdrawn
```

### Order Workflow

**VES Orders**:
1. Patty submits → Status: `PENDING`
2. Dairimar fulfills (adds exchange rate) → Status: `COMPLETED`
3. System calculates `usdt_sold = ves_amount ÷ exchange_rate`

**COP Orders**:
1. Patty submits → Status: `PENDING`
2. Brian fulfills (adds exchange rate) → Status: `COMPLETED`
3. System calculates `usdt_sold = cop_amount ÷ exchange_rate`

## Production Deployment

### With Docker + nginx-proxy (Multi-subdomain)

For production deployment with subdomains (powermental.vps.xxxx, pato.vps.xxxx, dai.vps.xxxx), see the detailed Docker deployment guide in `REQUIREMENTS.md` lines 1092-1286.

### Environment Variables

For production, set these environment variables:

```bash
JWT_SECRET=your-strong-secret-key
ADMIN_PASSWORD=secure-password
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Testing

Currently, the application includes manual testing workflows. See `REQUIREMENTS.md` lines 822-1010 for test scenarios.

## Security

- Profit data protected behind JWT authentication
- Password hashing with bcrypt
- Rate limiting on login endpoint
- Input validation on all transactions
- Parameterized database queries (SQL injection prevention)

## Documentation

- **CLAUDE.md** - Technical implementation guide
- **REQUIREMENTS.md** - Complete business requirements and specifications
- **README.md** - This file (quick start and overview)

## Development

### Adding New Features

1. Update database schema in `backend/src/database/schema.sql`
2. Run migrations
3. Add types in `backend/src/types/`
4. Create routes in `backend/src/routes/`
5. Update frontend types and API client
6. Build UI components

### Running Migrations

```bash
cd backend
npm run migrate
```

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Make sure PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Verify database exists

### Port Already in Use

If ports 3000 or 5173 are in use:

```bash
# Find process using port
lsof -i :3000
lsof -i :5173

# Kill the process
kill -9 <PID>
```

### Docker Issues

```bash
# Stop all containers
docker-compose down

# Remove volumes and rebuild
docker-compose down -v
docker-compose up --build
```

## License

Private project for Brian's USDT Exchange Service.

## Version

**Version**: 1.0
**Last Updated**: December 2025
