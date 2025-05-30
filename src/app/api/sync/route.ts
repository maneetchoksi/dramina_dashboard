import { NextResponse } from 'next/server';
import { syncCustomerData } from '@/lib/sync';

export async function POST() {
  try {
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