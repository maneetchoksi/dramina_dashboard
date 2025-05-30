import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  console.log('Debug endpoint called');
  
  try {
    // Get top 5 customers from sorted set with scores
    const topCustomersWithScores = await redis.zrange('customers:by:spend', 0, 4, {
      withScores: true,
      rev: true // Get highest scores first
    });

    // Parse the results - zrange with scores returns [member, score, member, score, ...]
    const topCustomers = [];
    for (let i = 0; i < topCustomersWithScores.length; i += 2) {
      topCustomers.push({
        customerId: topCustomersWithScores[i],
        totalSpend: topCustomersWithScores[i + 1]
      });
    }

    // Get the actual customer data for these IDs
    const customerData = [];
    for (const { customerId } of topCustomers) {
      const customer = await redis.hgetall(`customer:${customerId}`);
      customerData.push({
        customerId,
        redisKey: `customer:${customerId}`,
        data: customer,
        dataKeys: Object.keys(customer || {}),
        isEmpty: !customer || Object.keys(customer).length === 0
      });
    }

    // Also check if the sorted set exists and its size
    const sortedSetSize = await redis.zcard('customers:by:spend');

    // Check a few other potential key patterns
    const allKeys = await redis.keys('customer*');
    const keyPatterns = {
      'customer:*': allKeys.filter(k => k.startsWith('customer:')).slice(0, 5),
      'customers:*': allKeys.filter(k => k.startsWith('customers:')).slice(0, 5),
    };

    return NextResponse.json({
      success: true,
      debug: {
        sortedSet: {
          key: 'customers:by:spend',
          size: sortedSetSize,
          top5WithScores: topCustomers
        },
        customerData,
        keyPatterns,
        summary: {
          totalKeysFound: allKeys.length,
          sortedSetExists: sortedSetSize > 0,
          hasCustomerData: customerData.some(c => !c.isEmpty)
        }
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