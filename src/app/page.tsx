import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="max-w-md space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Moved</h1>

        <p className="text-muted-foreground text-lg">
          Please visit your dashboard in your account at Next Wave Loyalty.
        </p>

        <Button asChild className="w-full sm:w-auto" size="lg">
          <Link href="https://app.nextwaveloyalty.com" target="_blank" rel="noopener noreferrer">
            Go to app.nextwaveloyalty.com
          </Link>
        </Button>
      </div>
    </main>
  );
}