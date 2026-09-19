export type Currency = 'EUR' | 'GBP' | 'USD' | 'INR' | 'PLN' | 'AED';

export type CardType = 'debit' | 'credit' | 'DEBIT' | 'CREDIT';

export type CardStatus = 'active' | 'frozen' | 'deactivated' | 'declined' | 'pending';

export type BeneficiaryPayoutMethod = 'bank_account' | 'upi' | 'BANK_ACCOUNT' | 'UPI';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUSPICIOUS';

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeTerms: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface UpdateUserRequest {
  name?: string;
  countryOfResidence?: string;
  defaultCurrency?: Currency;
}

export interface CreateCardRequest {
  cardholderName: string;
  type?: CardType;
  cardNumber?: string;
  lastFourDigits?: string;
  expiryDate: string;
  cvv?: string;
}

export interface CreateBeneficiaryRequest {
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber?: string;
  bankCode?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}

export interface CreateTransferRequest {
  beneficiaryId: string;
  sourceWalletId: string;
  sendAmount: number;
  destinationCurrency: Currency;
}

export interface TransferResponse {
  id: string;
  reference: string;
  status: TransactionStatus;
  recipient: string;
  sendAmount: number;
  sourceCurrency: Currency;
  recipientAmount: number;
  destinationCurrency: Currency;
  fee: number;
  exchangeRate: number;
  date: string;
  createdAt: string;
}

export interface GetTransactionsQuery {
  status?: TransactionStatus;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionResponse {
  id: string;
  userId: string;
  reference: string;
  date: string;
  recipient: string;
  amount: number;
  currency: Currency;
  senderAmount: number | null;
  senderCurrency: Currency | null;
  recipientAmount: number | null;
  recipientCurrency: Currency | null;
  fee: number;
  exchangeRate: number | null;
  status: TransactionStatus;
  failureReason: string | null;
  createdAt: string;
}

export interface PaginatedTransactionsResponse {
  items: TransactionResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetQuoteQuery {
  from: Currency;
  to: Currency;
  amount: number;
}

export interface ExchangeRateResponse {
  id: string;
  from: Currency;
  to: Currency;
  rate: string;
  timestamp: string;
  createdAt: string;
}

export interface ExchangeRateQuoteResponse {
  from: Currency;
  to: Currency;
  amount: number;
  rate: number;
  convertedAmount: number;
}

