# Dramina Dashboard

A loyalty program dashboard for an aesthetics clinic to track and display top customers by visits and spend.

## Features

- 📊 Real-time customer rankings by visits and spend
- 🔄 Automatic data synchronization (refreshes hourly when page loads)
- 💳 Integration with Digital Wallet Cards loyalty API
- 🚀 Fast performance with Redis caching
- 📱 Responsive design for all devices

## Tech Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Upstash Redis
- **Deployment**: Vercel
- **UI Components**: shadcn/ui

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. Upstash Redis account
3. Loyalty program API credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dramina_dashboard.git
cd dramina_dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your credentials:
```env
# Loyalty Program API
LOYALTY_API_URL=https://api.digitalwallet.cards/api/v2/operations/
LOYALTY_API_KEY=your_api_key_here
LOYALTY_TEMPLATE_ID=646683

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `LOYALTY_API_URL`
   - `LOYALTY_API_KEY`
   - `LOYALTY_TEMPLATE_ID`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy!

The dashboard will automatically sync data when:
- The page loads and data is older than 60 minutes
- The manual sync button is clicked

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Run linting
npm run lint
```

## Architecture

- **API Routes**: Handle data fetching and synchronization
- **Redis Storage**: Customer data cached with sorted sets for rankings
- **Auto-sync**: Data refreshes automatically if older than 60 minutes
- **Event Processing**: Tracks visits (eventId: 42) and purchases (eventId: 9)