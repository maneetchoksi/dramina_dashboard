import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { CustomerMetrics } from '@/types/loyalty';
import { syncCustomerData, shouldAutoSync } from '@/lib/sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'visits';
    const limit = parseInt(searchParams.get('limit') || '10');
    const location = searchParams.get('location'); // 'jumeirah', 'rak', or null for all

    // Check if we should auto-sync (data older than 60 minutes)
    if (await shouldAutoSync(60)) {
      try {
        await syncCustomerData();
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
        // Continue with existing data if sync fails
      }
    }

    const client = await pool.connect();
    
    try {
      // Build query based on sorting and location
      let whereClause = '';
      const orderBy = sortBy === 'spend' ? 'total_spend DESC' : 'visit_count DESC';
      const filterCondition = sortBy === 'spend' ? 'total_spend > 0' : 'visit_count > 0';
      
      if (location === 'jumeirah') {
        whereClause = 'WHERE manager_id = 1547855';
      } else if (location === 'rak') {
        whereClause = 'WHERE manager_id = 1547856';
      }
      
      // Add filter condition
      if (whereClause) {
        whereClause += ` AND ${filterCondition}`;
      } else {
        whereClause = `WHERE ${filterCondition}`;
      }
      
      const query = `
        SELECT customer_id, first_name, surname, visit_count, total_spend, manager_id, last_updated
        FROM customers
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      
      // Convert to CustomerMetrics format
      const customers: CustomerMetrics[] = result.rows.map(row => ({
        customerId: row.customer_id,
        firstName: row.first_name,
        surname: row.surname,
        visitCount: row.visit_count,
        totalSpend: parseFloat(row.total_spend),
        managerId: row.manager_id,
        lastUpdated: row.last_updated.toISOString(),
      }));

      // Get last sync time
      const syncResult = await client.query('SELECT value FROM sync_metadata WHERE key = $1', ['last_sync']);
      const lastSync = syncResult.rows.length > 0 ? syncResult.rows[0].value : null;

      return NextResponse.json({
        success: true,
        customers,
        lastSync,
        sortBy,
        location,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}