import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    // Simple test to check Redis connection
    const size = await redis.zcard('customers:by:spend');
    const lastSync = await redis.get('sync:last');
    
    return NextResponse.json({
      success: true,
      sortedSetSize: size,
      lastSync: lastSync,
      message: size === 0 ? 'No data in Redis. Run sync first!' : `Found ${size} customers`
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}