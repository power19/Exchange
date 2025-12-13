const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/usdt_exchange'
});

async function createAdminUser() {
  try {
    const username = 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    console.log('Creating admin user...');
    console.log('Username:', username);
    console.log('Password:', password);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET password_hash = $2, role = $3
       RETURNING id, username, role`,
      [username, passwordHash, 'admin']
    );

    console.log('✅ Admin user created/updated successfully!');
    console.log('User details:', result.rows[0]);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
