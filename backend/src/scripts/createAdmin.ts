import bcrypt from 'bcrypt';
import pool from '../database/connection';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  try {
    const username = 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    console.log('Creating admin user...');

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET password_hash = $2`,
      [username, passwordHash, 'admin']
    );

    console.log('✅ Admin user created/updated successfully!');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('\n⚠️  Change the password in production!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
