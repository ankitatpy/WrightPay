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

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUSPICIOUS';

export interface Transaction<TStatus extends string = 'completed' | 'pending' | 'failed'> {
  id: string;
  userId?: string;
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
  reference: string;
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
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: string;
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
