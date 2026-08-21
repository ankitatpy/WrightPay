export type Currency = 'EUR' | 'GBP' | 'USD' | 'AED' | 'PLN' | 'INR';

export type Country = 'Germany' | 'UAE' | 'Poland' | 'UK' | 'USA';

export type AccountType = 'individual' | 'business';

export type KycStatus = 'pending' | 'approved' | 'rejected' | 'not_started';

export type AccountStatus = 'active' | 'suspended' | 'pending' | 'closed';

export interface User {
  id: string;
  name: string;
  email: string;
  accountType?: AccountType;
  countryOfResidence?: Country;
  kycStatus: KycStatus;
  accountStatus?: AccountStatus;
  defaultCurrency: Currency;
  mockPassword?: string;
}

export interface Wallet {
  id: string;
  userId?: string;
  currency: Currency;
  balance: number;
  isDefault: boolean;
}

export interface WalletResponse {
  id: string;
  currency: Currency;
  balance: number;
  isDefault: boolean;
  equivalents: Record<Currency, number>;
}


export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUSPICIOUS'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'suspicious';

export interface Transaction<TStatus extends string = TransactionStatus> {
  id: string;
  userId?: string;
  reference: string;
  date: string;
  recipient: string;
  amount: number;
  currency: Currency;
  senderAmount?: number;
  senderCurrency?: Currency;
  recipientAmount?: number;
  recipientCurrency?: Currency;
  fee: number;
  exchangeRate: number;
  status: TStatus;
  failureReason?: string;
}

export type MockTransaction = Transaction<TransactionStatus>;

export type BeneficiaryPayoutMethod = 'bank_account' | 'upi';

export interface Beneficiary {
  id: string;
  userId?: string;
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber: string;
  bankCode: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}

export type CardStatus = 'active' | 'frozen' | 'deactivated' | 'declined' | 'pending';

export interface Card {
  id: string;
  userId?: string;
  lastFourDigits: string;
  cardholderName: string;
  expiryDate: string;
  status: CardStatus;
  type: 'debit' | 'credit';
}

export interface ExchangeRate {
  id?: string;
  from: Currency;
  to: Currency;
  rate: number;
  timestamp?: string;
  createdAt?: string;
}

export interface ExchangeQuote {
  from: Currency;
  to: Currency;
  amount: number;
  rate: number;
  convertedAmount: number;
}


export interface VerificationRecord {
  email: string;
  verificationCode: string;
  isVerified: boolean;
  createdAt?: string;
  expiresAt?: string;
}

export interface TransferDraft {
  sourceWalletId: string;
  beneficiaryId: string;
  sendAmount: number;
  sendCurrency: Currency;
  receiveAmount: number;
  receiveCurrency: Currency;
  exchangeRate: number;
  fee: number;
  totalDebitAmount: number;
}
