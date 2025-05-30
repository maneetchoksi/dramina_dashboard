'use client';

import { useState, useEffect } from 'react';
import { CustomerMetrics } from '@/types/loyalty';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardData {
  customers: CustomerMetrics[];
  lastSync: string | null;
}

export default function Home() {
  const [topByVisits, setTopByVisits] = useState<DashboardData | null>(null);
  const [topBySpend, setTopBySpend] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both rankings in parallel
      const [visitsRes, spendRes] = await Promise.all([
        fetch('/api/customers?sortBy=visits&limit=10'),
        fetch('/api/customers?sortBy=spend&limit=10'),
      ]);

      if (!visitsRes.ok || !spendRes.ok) {
        throw new Error('Failed to fetch customer data');
      }

      const visitsData = await visitsRes.json();
      const spendData = await spendRes.json();

      setTopByVisits(visitsData);
      setTopBySpend(spendData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    try {
      setSyncing(true);
      setError(null);

      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to sync data');
      }

      // Refresh the dashboard after sync
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-AE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Loyalty Dashboard</h1>
          <div className="flex items-center gap-4">
            {topByVisits?.lastSync && (
              <span className="text-sm text-muted-foreground">
                Last synced: {formatDate(topByVisits.lastSync)}
              </span>
            )}
            <Button
              onClick={syncData}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Error: {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Top Customers by Visits */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Visits</CardTitle>
              <CardDescription>Most frequent visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topByVisits?.customers.map((customer, index) => (
                  <div
                    key={customer.customerId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <div className="font-medium">
                        {customer.firstName} {customer.surname}
                      </div>
                    </div>
                    <div className="font-medium">
                      {customer.visitCount} visits
                    </div>
                  </div>
                ))}
                {(!topByVisits?.customers || topByVisits.customers.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers by Spend */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Spend</CardTitle>
              <CardDescription>Highest spending customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topBySpend?.customers.map((customer, index) => (
                  <div
                    key={customer.customerId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <div className="font-medium">
                        {customer.firstName} {customer.surname}
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatCurrency(customer.totalSpend)}
                    </div>
                  </div>
                ))}
                {(!topBySpend?.customers || topBySpend.customers.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}