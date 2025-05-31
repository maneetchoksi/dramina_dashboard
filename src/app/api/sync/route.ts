import { NextResponse } from 'next/server';
import { syncCustomerData } from '@/lib/sync';
import { initializeDatabase } from '@/lib/db';

export async function POST() {
  try {
    // Ensure database tables exist before syncing
    await initializeDatabase();
    
    const result = await syncCustomerData();

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      customersProcessed: result.customersProcessed,
      operationsProcessed: result.operationsProcessed,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}