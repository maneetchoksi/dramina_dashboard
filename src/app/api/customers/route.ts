import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
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

    // Get sorted customer IDs based on metric and location
    let sortKey = sortBy === 'spend' ? 'customers:by:spend' : 'customers:by:visits';
    if (location) {
      sortKey += `:${location}`;
    }
    
    // Fetch more than needed to account for filtering
    const topCustomerIds = await redis.zrange(sortKey, 0, limit * 2, { rev: true });

    if (!topCustomerIds || topCustomerIds.length === 0) {
      return NextResponse.json({
        success: true,
        customers: [],
        lastSync: await redis.get('sync:last'),
      });
    }

    // Fetch customer details for each ID
    const pipeline = redis.pipeline();
    for (const customerId of topCustomerIds) {
      pipeline.hgetall(`customer:${customerId}`);
    }
    
    const results = await pipeline.exec();
    
    // Convert results to CustomerMetrics array and filter out zero values
    const customers: CustomerMetrics[] = results
      .map((result) => result as CustomerMetrics)
      .filter(Boolean)
      .filter((customer) => {
        // Convert string values to numbers for comparison
        const totalSpend = typeof customer.totalSpend === 'string' ? parseFloat(customer.totalSpend) : customer.totalSpend;
        const visitCount = typeof customer.visitCount === 'string' ? parseInt(customer.visitCount) : customer.visitCount;
        
        if (sortBy === 'spend') {
          return totalSpend > 0;
        } else {
          return visitCount > 0;
        }
      })
      .slice(0, limit);

    // Get last sync time
    const lastSync = await redis.get('sync:last');

    return NextResponse.json({
      success: true,
      customers,
      lastSync,
      sortBy,
      location,
    });
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