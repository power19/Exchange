-- Migration: Add customer information fields to orders
-- Run this on existing database if schema.sql already executed

ALTER TABLE ves_orders
ADD COLUMN IF NOT EXISTS bank VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);

ALTER TABLE cop_orders
ADD COLUMN IF NOT EXISTS bank VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);
