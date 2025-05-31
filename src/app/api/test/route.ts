import { NextResponse } from 'next/server';
import { pool, initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    // Initialize database tables
    await initializeDatabase();
    
    // Simple test to check PostgreSQL connection
    const client = await pool.connect();
    
    try {
      const customerCount = await client.query('SELECT COUNT(*) FROM customers');
      const syncResult = await client.query('SELECT value FROM sync_metadata WHERE key = $1', ['last_sync']);
      const lastSync = syncResult.rows.length > 0 ? syncResult.rows[0].value : null;
      
      return NextResponse.json({
        success: true,
        customerCount: parseInt(customerCount.rows[0].count),
        lastSync: lastSync,
        message: customerCount.rows[0].count === '0' ? 'No data in database. Run sync first!' : `Found ${customerCount.rows[0].count} customers`
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}