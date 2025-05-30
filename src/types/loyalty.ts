export interface LoyaltyCustomer {
  id: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  surname: string;
  firstName: string;
  externalUserId: string | null;
  createdAt: string;
  updatedAt: string;
  segments: unknown[];
}

export interface LoyaltyOperation {
  id: number;
  companyId: number;
  templateId: number;
  customerId: string;
  customer: LoyaltyCustomer;
  cardId: string;
  cardDevice: string;
  eventId: number;
  managerId: number;
  locationId: number;
  amount: number;
  purchaseSum: number;
  balance: number;
  source: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyApiResponse {
  responseId: string;
  createdAt: string;
  code: number;
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
  data: LoyaltyOperation[];
}

export interface CustomerMetrics {
  customerId: string;
  firstName: string;
  surname: string;
  visitCount: number;
  totalSpend: number;
  lastUpdated: string;
  managerId?: number;
}

export const EVENT_IDS = {
  VISIT: 42,
  SPEND: 9
} as const;