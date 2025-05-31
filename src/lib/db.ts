import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? {
    rejectUnauthorized: false
  } : false
});

export { pool };

// Initialize database tables
export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(255),
        surname VARCHAR(255),
        visit_count INTEGER DEFAULT 0,
        total_spend DECIMAL(10,2) DEFAULT 0,
        manager_id INTEGER,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_visit_count ON customers (visit_count DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_total_spend ON customers (total_spend DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_manager_id ON customers (manager_id);
    `);

    // Create sync metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    client.release();
  }
}