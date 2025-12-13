-- Migration: Add audit_logs table for CRUD tracking
-- Run this on existing databases to add audit logging functionality

-- Create audit logs table
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
