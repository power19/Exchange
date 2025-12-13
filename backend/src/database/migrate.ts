import pool from './connection';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );

    await pool.query(schemaSQL);

    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
