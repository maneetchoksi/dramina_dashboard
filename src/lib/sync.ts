import axios from 'axios';
import { pool } from '@/lib/db';
import {
  LoyaltyApiResponse,
  LoyaltyOperation,
  CustomerMetrics,
  EVENT_IDS
} from '@/types/loyalty';

export async function syncCustomerData() {
  // Fetch all operations from the loyalty API with pagination
  const allOperations: LoyaltyOperation[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await axios.get<LoyaltyApiResponse>(
      `${process.env.LOYALTY_API_URL}?templateId=${process.env.LOYALTY_TEMPLATE_ID}&page=${currentPage}&limit=1000&startDate=2025-05-28`,
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

    // Add operations from this page
    allOperations.push(...response.data.data);

    // Calculate total pages based on metadata
    const { totalItems, itemsPerPage } = response.data.meta;
    totalPages = Math.ceil(totalItems / itemsPerPage);

    console.log(`Fetched page ${currentPage}/${totalPages} (${response.data.data.length} operations)`);
    currentPage++;
  } while (currentPage <= totalPages);

  console.log(`Total operations fetched: ${allOperations.length}`);

  // Process operations and aggregate by customer
  const customerMetrics = new Map<string, CustomerMetrics>();
  const processedOperationIds = new Set<number>();
  const customerManagerMap = new Map<string, number>(); // Track latest managerId per customer

  for (const operation of allOperations) {
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

  // Store in PostgreSQL using transaction for efficiency
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing customer data
    await client.query('DELETE FROM customers');

    // Insert all customer data in batch using upsert
    const values = Array.from(customerMetrics.values());
    if (values.length > 0) {
      const insertQuery = `
        INSERT INTO customers (customer_id, first_name, surname, visit_count, total_spend, manager_id)
        VALUES ${values.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
        ON CONFLICT (customer_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          surname = EXCLUDED.surname,
          visit_count = EXCLUDED.visit_count,
          total_spend = EXCLUDED.total_spend,
          manager_id = EXCLUDED.manager_id,
          last_updated = CURRENT_TIMESTAMP
      `;

      const insertValues = values.flatMap(metrics => [
        metrics.customerId,
        metrics.firstName,
        metrics.surname,
        metrics.visitCount,
        metrics.totalSpend,
        metrics.managerId
      ]);

      await client.query(insertQuery, insertValues);
    }

    // Set last sync timestamp
    await client.query(`
      INSERT INTO sync_metadata (key, value, updated_at)
      VALUES ('last_sync', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    `, [new Date().toISOString()]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

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
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT value FROM sync_metadata WHERE key = $1',
      ['last_sync']
    );

    if (result.rows.length === 0) {
      return true; // No sync has ever been done
    }

    const lastSyncTime = new Date(result.rows[0].value).getTime();
    const now = Date.now();
    const minutesSinceSync = (now - lastSyncTime) / (1000 * 60);

    return minutesSinceSync > staleMinutes;
  } finally {
    client.release();
  }
}