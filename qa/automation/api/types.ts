export type Currency = 'EUR' | 'GBP' | 'USD' | 'INR' | 'PLN';

export type CardType = 'debit' | 'credit' | 'DEBIT' | 'CREDIT';

export type CardStatus = 'active' | 'frozen' | 'deactivated' | 'declined' | 'pending';

export type BeneficiaryPayoutMethod = 'BANK_ACCOUNT' | 'UPI';

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

export interface GetTransactionsQuery {
  status?: TransactionStatus;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface GetQuoteQuery {
  from: Currency;
  to: Currency;
  amount: number;
}
