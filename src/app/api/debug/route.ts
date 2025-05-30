import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  console.log('Debug endpoint called');
  
  try {
    // Check all sorted sets
    const sortedSets = [
      'customers:by:spend',
      'customers:by:visits',
      'customers:by:spend:jumeirah',
      'customers:by:visits:jumeirah',
      'customers:by:spend:rak',
      'customers:by:visits:rak'
    ];

    const sortedSetInfo: any = {};
    
    for (const setKey of sortedSets) {
      const size = await redis.zcard(setKey);
      const top5WithScores = await redis.zrange(setKey, 0, 4, {
        withScores: true,
        rev: true
      });
      
      // Parse the results
      const topMembers = [];
      for (let i = 0; i < top5WithScores.length; i += 2) {
        topMembers.push({
          customerId: top5WithScores[i],
          score: top5WithScores[i + 1]
        });
      }
      
      sortedSetInfo[setKey] = {
        size,
        top5: topMembers
      };
    }

    // Get a sample of customer data to check managerId
    const allCustomerIds = await redis.zrange('customers:by:spend', 0, 19, { rev: true });
    const customerDetails = [];
    
    for (const customerId of allCustomerIds.slice(0, 10)) {
      const customer = await redis.hgetall(`customer:${customerId}`);
      customerDetails.push({
        customerId,
        data: customer,
        managerId: customer?.managerId,
        location: customer?.managerId === '1547855' ? 'jumeirah' : 
                  customer?.managerId === '1547856' ? 'rak' : 'unknown'
      });
    }

    // Count customers by managerId
    const managerIdCounts: any = {};
    for (const detail of customerDetails) {
      const managerId = detail.data?.managerId || 'none';
      managerIdCounts[managerId] = (managerIdCounts[managerId] || 0) + 1;
    }

    // Check if location-specific sets have the same customers
    const jumeirahSpendIds = await redis.zrange('customers:by:spend:jumeirah', 0, -1, { rev: true });
    const rakSpendIds = await redis.zrange('customers:by:spend:rak', 0, -1, { rev: true });
    
    // Check overlap between main set and location sets
    const mainSpendIds = await redis.zrange('customers:by:spend', 0, -1, { rev: true });
    const jumeirahInMain = jumeirahSpendIds.filter(id => mainSpendIds.includes(id));
    const rakInMain = rakSpendIds.filter(id => mainSpendIds.includes(id));

    return NextResponse.json({
      success: true,
      debug: {
        sortedSets: sortedSetInfo,
        sampleCustomers: customerDetails,
        managerIdDistribution: managerIdCounts,
        locationSetAnalysis: {
          jumeirah: {
            totalCustomers: jumeirahSpendIds.length,
            sampleIds: jumeirahSpendIds.slice(0, 5),
            overlapWithMain: jumeirahInMain.length
          },
          rak: {
            totalCustomers: rakSpendIds.length,
            sampleIds: rakSpendIds.slice(0, 5),
            overlapWithMain: rakInMain.length
          }
        },
        lastSync: await redis.get('sync:last')
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}