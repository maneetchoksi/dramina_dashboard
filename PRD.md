# Product Requirements Document (PRD)
## Loyalty Program Dashboard

### Overview
A web dashboard for an aesthetics clinic with two locations to track and display top customers by visits and spend from their loyalty program API.

### Business Context
- **Business**: Aesthetics clinic with 2 locations
- **Current customer base**: ~50 customers
- **Expected growth**: Up to 500-1000 customers
- **Goal**: "Set and forget" solution with minimal maintenance

### Core Requirements

#### Functional Requirements
1. **Customer Rankings Display**
   - Top customers by total visits (leaderboard format)
   - Top customers by total spend (leaderboard format)
   - Display customer name, visit count, and total spend

2. **Data Synchronization**
   - Fetch customer data from loyalty program API
   - Prevent duplicate entries for same customer transactions
   - Incremental updates to avoid recalculating from scratch
   - Handle data from both clinic locations

3. **Dashboard Interface**
   - Clean, responsive design
   - Real-time or near real-time data display
   - Easy to read rankings/leaderboards

#### Technical Requirements
1. **Architecture**
   - Next.js 15 with TypeScript
   - Upstash Redis for data storage
   - Vercel hosting (free tier)
   - API route for data synchronization

2. **Data Storage Strategy**
   - Store aggregated customer data in Redis
   - Key structure: `customer:{id}` → `{name, visits, spend, lastUpdate}`
   - Sorted sets for rankings: `customers:by:visits`, `customers:by:spend`

3. **Performance**
   - Sub-second dashboard load times
   - Efficient API calls to loyalty program
   - Minimal API rate limit impact

#### Non-Functional Requirements
- **Scalability**: Handle 50-1000 customers
- **Reliability**: 99%+ uptime
- **Maintenance**: Minimal ongoing maintenance required
- **Cost**: Stay within free hosting tiers

### User Stories
1. **As a clinic owner**, I want to see my top customers by visits so I can recognize loyal clients
2. **As a clinic owner**, I want to see my top customers by spend so I can identify high-value clients
3. **As a clinic owner**, I want the data to update automatically so I don't need to manually refresh

### API Integration

#### API Endpoint Details
- **Base URL**: `https://api.digitalwallet.cards/api/v2/operations/`
- **Method**: GET
- **Required Parameters**: `templateId=646683`
- **Authentication**: `x-api-key: 53c5ed5e366294755cc89b65c0a63b00`
- **Content-Type**: `application/json`

#### Example API Call
```bash
curl --request GET \
  --url 'https://api.digitalwallet.cards/api/v2/operations/?templateId=646683' \
  --header 'content-type: application/json' \
  --header 'x-api-key: 53c5ed5e366294755cc89b65c0a63b00'
```

#### Loyalty Program API Response Structure
```json
{
  "responseId": "uuid",
  "createdAt": "ISO timestamp",
  "code": 200,
  "meta": {
    "totalItems": 198,
    "itemsPerPage": 1000,
    "currentPage": 1
  },
  "data": [
    {
      "id": 49309174,
      "companyId": 132141,
      "templateId": 646683,
      "customerId": "uuid",
      "customer": {
        "id": "uuid",
        "phone": "string",
        "email": "string|null",
        "gender": "string|null",
        "dateOfBirth": "date",
        "surname": "string",
        "firstName": "string",
        "externalUserId": "string|null",
        "createdAt": "ISO timestamp",
        "updatedAt": "ISO timestamp",
        "segments": []
      },
      "cardId": "string",
      "cardDevice": "string",
      "eventId": 24,
      "managerId": 1547855,
      "locationId": 110659,
      "amount": 7.98,
      "purchaseSum": 0,
      "balance": 7,
      "source": "string",
      "comment": "string",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ]
}
```

#### Key Data Points for Dashboard
- **Customer Identification**: `customerId` + `customer.firstName` + `customer.surname`
- **Event Classification**: 
  - `eventId: 42` = Visit logged
  - `eventId: 9` = Purchase/Spend transaction
- **Spend Amount**: `purchaseSum` field (actual purchase amount in currency)
- **Location Tracking**: `locationId` (to handle multi-location data)
- **Transaction Deduplication**: `id` (unique operation ID)
- **Timestamps**: `createdAt` (for incremental sync and date filtering)

#### Data Processing Logic
1. **Visit Counting**: Count operations where `eventId === 42` per customer
2. **Spend Calculation**: Sum `purchaseSum` for operations where `eventId === 9` per customer
3. **Deduplication**: Use operation `id` to prevent double-counting
4. **Multi-location**: Aggregate across all `locationId`s unless filtering is needed

### Technical Implementation Plan
1. **Phase 1**: Basic dashboard with manual sync
   - Set up Upstash Redis connection
   - Create API route to fetch and store customer data
   - Implement event ID filtering for visits and spend
   - Build basic dashboard UI with top 10 lists

2. **Phase 2**: Automated sync and polish
   - Implement incremental sync using `createdAt` timestamps
   - Add duplicate prevention using operation `id`s
   - Add automatic refresh capabilities
   - Polish UI and add loading states

### Success Metrics
- Dashboard loads in <2 seconds
- Data accuracy: 100% match with loyalty API
- Zero manual intervention required after deployment
- Successful handling of customer base growth to 1000+

### Constraints
- Must work within Vercel free tier limits
- Must use existing loyalty program API (no modifications)
- Minimal complexity for long-term maintenance

### Future Considerations
- Date range filtering
- Additional metrics (average spend per visit, etc.)
- Export capabilities
- Multi-location breakdowns