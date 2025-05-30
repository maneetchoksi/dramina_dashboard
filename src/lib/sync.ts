import axios from 'axios';
import { redis } from '@/lib/redis';
import { 
  LoyaltyApiResponse, 
  CustomerMetrics, 
  EVENT_IDS 
} from '@/types/loyalty';

export async function syncCustomerData() {
  // Fetch all operations from the loyalty API
  const response = await axios.get<LoyaltyApiResponse>(
    `${process.env.LOYALTY_API_URL}?templateId=${process.env.LOYALTY_TEMPLATE_ID}`,
    {
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.LOYALTY_API_KEY!,
      },
    }
  );

  if (response.data.code !== 200) {
    throw new Error('Failed to fetch loyalty data');
  }

  // Process operations and aggregate by customer
  const customerMetrics = new Map<string, CustomerMetrics>();
  const processedOperationIds = new Set<number>();
  const customerManagerMap = new Map<string, number>(); // Track latest managerId per customer

  for (const operation of response.data.data) {
    // Skip if we've already processed this operation (deduplication)
    if (processedOperationIds.has(operation.id)) {
      continue;
    }
    processedOperationIds.add(operation.id);

    const customerId = operation.customerId;
    
    // Track the latest managerId for this customer
    customerManagerMap.set(customerId, operation.managerId);
    
    // Initialize customer metrics if not exists
    if (!customerMetrics.has(customerId)) {
      customerMetrics.set(customerId, {
        customerId,
        firstName: operation.customer.firstName,
        surname: operation.customer.surname,
        visitCount: 0,
        totalSpend: 0,
        lastUpdated: new Date().toISOString(),
        managerId: operation.managerId,
      });
    }

    const metrics = customerMetrics.get(customerId)!;
    
    // Update managerId only if the operation has a non-null managerId
    // This ensures we keep the last known valid managerId
    if (operation.managerId !== null) {
      metrics.managerId = operation.managerId;
    }

    // Update metrics based on event type
    if (operation.eventId === EVENT_IDS.VISIT) {
      metrics.visitCount += 1;
    } else if (operation.eventId === EVENT_IDS.SPEND) {
      metrics.totalSpend += operation.purchaseSum;
    }
  }

  // Store in Redis using pipeline for efficiency
  const pipeline = redis.pipeline();

  // Clear existing sorted sets
  pipeline.del('customers:by:visits');
  pipeline.del('customers:by:spend');
  pipeline.del('customers:by:visits:jumeirah');
  pipeline.del('customers:by:spend:jumeirah');
  pipeline.del('customers:by:visits:rak');
  pipeline.del('customers:by:spend:rak');

  // Store each customer's data and add to sorted sets
  for (const [customerId, metrics] of customerMetrics) {
    // Store customer data
    pipeline.hset(`customer:${customerId}`, { ...metrics });
    
    // Add to sorted sets for rankings
    pipeline.zadd('customers:by:visits', {
      score: metrics.visitCount,
      member: customerId,
    });
    
    pipeline.zadd('customers:by:spend', {
      score: metrics.totalSpend,
      member: customerId,
    });
    
    // Add to location-specific sorted sets
    if (metrics.managerId === 1547855) { // Jumeirah
      pipeline.zadd('customers:by:visits:jumeirah', {
        score: metrics.visitCount,
        member: customerId,
      });
      pipeline.zadd('customers:by:spend:jumeirah', {
        score: metrics.totalSpend,
        member: customerId,
      });
    } else if (metrics.managerId === 1547856) { // RAK
      pipeline.zadd('customers:by:visits:rak', {
        score: metrics.visitCount,
        member: customerId,
      });
      pipeline.zadd('customers:by:spend:rak', {
        score: metrics.totalSpend,
        member: customerId,
      });
    }
  }

  // Set last sync timestamp
  pipeline.set('sync:last', new Date().toISOString());

  // Execute all Redis commands
  await pipeline.exec();

  // Count customers with visits and spend
  const visitorsCount = Array.from(customerMetrics.values()).filter(m => m.visitCount > 0).length;
  const spendersCount = Array.from(customerMetrics.values()).filter(m => m.totalSpend > 0).length;

  return {
    customersProcessed: customerMetrics.size,
    operationsProcessed: processedOperationIds.size,
    visitorsCount,
    spendersCount,
  };
}

export async function shouldAutoSync(staleMinutes: number = 60): Promise<boolean> {
  const lastSync = await redis.get('sync:last');
  
  if (!lastSync) {
    return true; // No sync has ever been done
  }

  const lastSyncTime = new Date(lastSync as string).getTime();
  const now = Date.now();
  const minutesSinceSync = (now - lastSyncTime) / (1000 * 60);

  return minutesSinceSync > staleMinutes;
}