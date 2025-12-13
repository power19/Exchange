-- USDT Exchange Service Database Schema

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_usdt DECIMAL(10, 2) NOT NULL CHECK (amount_usdt > 0),
    fee_percentage DECIMAL(5, 4) NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 1),
    total_cost_usd DECIMAL(12, 2) NOT NULL CHECK (total_cost_usd > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transfers table (Brian → Dairimar)
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_usdt DECIMAL(10, 2) NOT NULL CHECK (amount_usdt > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Conversions table (USDT → VES)
CREATE TABLE IF NOT EXISTS conversions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usdt_amount DECIMAL(10, 2) NOT NULL CHECK (usdt_amount > 0),
    ves_received BIGINT NOT NULL CHECK (ves_received > 0),
    exchange_rate DECIMAL(10, 2) NOT NULL CHECK (exchange_rate > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- VES Orders table
CREATE TABLE IF NOT EXISTS ves_orders (
    id SERIAL PRIMARY KEY,
    date_submitted TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(255) NOT NULL,
    amount_ves BIGINT NOT NULL CHECK (amount_ves > 0),
    bank VARCHAR(100),
    phone_number VARCHAR(50),
    customer_id VARCHAR(100),
    account_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    exchange_rate DECIMAL(10, 2) CHECK (exchange_rate IS NULL OR exchange_rate > 0),
    usdt_sold DECIMAL(10, 2) CHECK (usdt_sold IS NULL OR usdt_sold > 0),
    date_completed TIMESTAMP WITH TIME ZONE,
    submitted_by VARCHAR(100) DEFAULT 'patty',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- COP Orders table
CREATE TABLE IF NOT EXISTS cop_orders (
    id SERIAL PRIMARY KEY,
    date_submitted TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(255) NOT NULL,
    amount_cop INTEGER NOT NULL CHECK (amount_cop > 0),
    bank VARCHAR(100),
    phone_number VARCHAR(50),
    customer_id VARCHAR(100),
    account_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    exchange_rate DECIMAL(10, 2) CHECK (exchange_rate IS NULL OR exchange_rate > 0),
    usdt_sold DECIMAL(10, 2) CHECK (usdt_sold IS NULL OR usdt_sold > 0),
    date_completed TIMESTAMP WITH TIME ZONE,
    submitted_by VARCHAR(100) DEFAULT 'patty',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawals table (profit withdrawals)
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_usdt DECIMAL(10, 2) NOT NULL CHECK (amount_usdt > 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- USDT Requests table (Dairimar → Brian)
CREATE TABLE IF NOT EXISTS usdt_requests (
    id SERIAL PRIMARY KEY,
    date_requested TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_usdt DECIMAL(10, 2) NOT NULL CHECK (amount_usdt > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED', 'REJECTED')),
    date_resolved TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Exchange Rates table (for live rate management)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('VES', 'COP')),
    rate DECIMAL(10, 2) NOT NULL CHECK (rate > 0),
    set_by VARCHAR(100) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table (for tracking changes)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    old_values JSONB,
    new_values JSONB,
    notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_ves_orders_status ON ves_orders(status);
CREATE INDEX IF NOT EXISTS idx_ves_orders_date_submitted ON ves_orders(date_submitted DESC);
CREATE INDEX IF NOT EXISTS idx_ves_orders_date_completed ON ves_orders(date_completed DESC);
CREATE INDEX IF NOT EXISTS idx_cop_orders_status ON cop_orders(status);
CREATE INDEX IF NOT EXISTS idx_cop_orders_date_submitted ON cop_orders(date_submitted DESC);
CREATE INDEX IF NOT EXISTS idx_cop_orders_date_completed ON cop_orders(date_completed DESC);
CREATE INDEX IF NOT EXISTS idx_usdt_requests_status ON usdt_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);
CREATE INDEX IF NOT EXISTS idx_conversions_date ON conversions(date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_active ON exchange_rates(currency, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_created_at ON exchange_rates(created_at DESC);
