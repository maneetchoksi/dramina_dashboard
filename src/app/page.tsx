'use client';

import { useState, useEffect } from 'react';
import { CustomerMetrics } from '@/types/loyalty';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface DashboardData {
  customers: CustomerMetrics[];
  lastSync: string | null;
  location?: string;
}

type LocationTab = 'all' | 'jumeirah' | 'rak';

export default function Home() {
  const [activeTab, setActiveTab] = useState<LocationTab>('all');
  const [topByVisits, setTopByVisits] = useState<Record<LocationTab, DashboardData | null>>({
    all: null,
    jumeirah: null,
    rak: null,
  });
  const [topBySpend, setTopBySpend] = useState<Record<LocationTab, DashboardData | null>>({
    all: null,
    jumeirah: null,
    rak: null,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data for all locations
      const locations: { key: LocationTab; param: string | null }[] = [
        { key: 'all', param: null },
        { key: 'jumeirah', param: 'jumeirah' },
        { key: 'rak', param: 'rak' },
      ];

      const promises = locations.flatMap(({ key, param }) => [
        fetch(`/api/customers?sortBy=visits&limit=10${param ? `&location=${param}` : ''}`).then(async (res) => ({
          key,
          type: 'visits' as const,
          data: await res.json(),
        })),
        fetch(`/api/customers?sortBy=spend&limit=10${param ? `&location=${param}` : ''}`).then(async (res) => ({
          key,
          type: 'spend' as const,
          data: await res.json(),
        })),
      ]);

      const results = await Promise.all(promises);

      const newTopByVisits = { ...topByVisits };
      const newTopBySpend = { ...topBySpend };

      results.forEach(({ key, type, data }) => {
        if (type === 'visits') {
          newTopByVisits[key] = data;
        } else {
          newTopBySpend[key] = data;
        }
      });

      setTopByVisits(newTopByVisits);
      setTopBySpend(newTopBySpend);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const tabLabels: Record<LocationTab, string> = {
    all: 'All Locations',
    jumeirah: 'Jumeirah',
    rak: 'RAK',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const currentVisitsData = topByVisits[activeTab];
  const currentSpendData = topBySpend[activeTab];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Dr. Amina Al Amiri Loyalty Dashboard</h1>
          <div className="flex items-center gap-4">
            {topByVisits.all?.lastSync && (
              <span className="text-sm text-muted-foreground">
                Last synced: {formatDate(topByVisits.all.lastSync)}
              </span>
            )}
            <ThemeToggle />
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

        {/* Location Tabs */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(tabLabels) as LocationTab[]).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </Button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Top Customers by Visits */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Visits</CardTitle>
              <CardDescription>
                Most frequent visitors {activeTab !== 'all' && `at ${tabLabels[activeTab]}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentVisitsData?.customers?.map((customer, index) => (
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
                {(!currentVisitsData?.customers || currentVisitsData.customers.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers by Spend */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Spend</CardTitle>
              <CardDescription>
                Highest spending customers {activeTab !== 'all' && `at ${tabLabels[activeTab]}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentSpendData?.customers?.map((customer, index) => (
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
                {(!currentSpendData?.customers || currentSpendData.customers.length === 0) && (
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