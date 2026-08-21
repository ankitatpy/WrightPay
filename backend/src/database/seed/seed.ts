import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import {
  User,
  AccountType,
  KycStatus,
  AccountStatus,
} from '../../modules/users/entities/user.entity';
import { Currency } from '../../core/enums/currency.enum';
import { Wallet } from '../../modules/wallets/entities/wallet.entity';
import { ExchangeRate } from '../../modules/exchange-rates/entities/exchange-rate.entity';
import {
  Beneficiary,
  BeneficiaryPayoutMethod,
} from '../../modules/beneficiaries/entities/beneficiary.entity';
import {
  Card,
  CardStatus,
  CardType,
} from '../../modules/cards/entities/card.entity';
import {
  Transaction,
  TransactionStatus,
} from '../../modules/transactions/entities/transaction.entity';
import { EmailVerification } from '../../modules/auth/entities/email-verification.entity';

// Config
const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgres://postgres:password@localhost:5432/wrightpay',
  entities: [
    User,
    Wallet,
    ExchangeRate,
    Beneficiary,
    Card,
    Transaction,
    EmailVerification,
  ],
  synchronize: true, // using synchronize for seed script
});


async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected.');

  // Clean DB
  await AppDataSource.query(
    'TRUNCATE TABLE transactions, cards, beneficiaries, exchange_rates, wallets, email_verifications, users CASCADE',
  );

  const passwordHash = await argon2.hash('Password123!');

  // Seed Users
  const anna = AppDataSource.manager.create(User, {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Anna Kowalski',
    email: 'anna.kowalski@example.com',
    passwordHash,
    accountType: AccountType.INDIVIDUAL,
    countryOfResidence: 'Germany',
    kycStatus: KycStatus.APPROVED,
    accountStatus: AccountStatus.ACTIVE,
    defaultCurrency: Currency.EUR,
  });

  const tariq = AppDataSource.manager.create(User, {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Tariq Al-Fayed',
    email: 'tariq.al-fayed@example.com',
    passwordHash,
    accountType: AccountType.INDIVIDUAL,
    countryOfResidence: 'UAE',
    kycStatus: KycStatus.APPROVED,
    accountStatus: AccountStatus.ACTIVE,
    defaultCurrency: Currency.AED,
  });


  const acme = AppDataSource.manager.create(User, {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Acme Corp Ltd',
    email: 'finance@acmecorp.example.com',
    passwordHash,
    accountType: AccountType.BUSINESS,
    countryOfResidence: 'UK',
    kycStatus: KycStatus.APPROVED,
    accountStatus: AccountStatus.ACTIVE,
    defaultCurrency: Currency.GBP,
  });

  await AppDataSource.manager.save([anna, tariq, acme]);

  // Seed Wallets
  const annaWallet = AppDataSource.manager.create(Wallet, {
    userId: anna.id,
    currency: Currency.EUR,
    balance: 2500.0,
    isDefault: true,
  });

  const tariqWallet = AppDataSource.manager.create(Wallet, {
    userId: tariq.id,
    currency: Currency.AED,
    balance: 15000.0,
    isDefault: true,
  });

  const acmeWallet = AppDataSource.manager.create(Wallet, {
    userId: acme.id,
    currency: Currency.GBP,
    balance: 85000.0,
    isDefault: true,
  });

  await AppDataSource.manager.save([annaWallet, tariqWallet, acmeWallet]);

  // Seed Exchange Rates
  const now = new Date();
  const rates = [
    { from: Currency.EUR, to: Currency.USD, rate: 1.08, timestamp: now },
    { from: Currency.EUR, to: Currency.GBP, rate: 0.85, timestamp: now },
    { from: Currency.EUR, to: Currency.AED, rate: 3.96, timestamp: now },
    { from: Currency.EUR, to: Currency.PLN, rate: 4.3, timestamp: now },
    { from: Currency.EUR, to: Currency.INR, rate: 89.5, timestamp: now },
  ].map((r) => AppDataSource.manager.create(ExchangeRate, r));

  await AppDataSource.manager.save(rates);

  // Seed Beneficiary
  const annaBen = AppDataSource.manager.create(Beneficiary, {
    userId: anna.id,
    name: 'Maria Rossi',
    currency: Currency.EUR,
    payoutMethod: BeneficiaryPayoutMethod.BANK_ACCOUNT,
    accountNumber: 'IT12A345678901234567890',
    bankCode: 'UNCRITM1',
  });
  await AppDataSource.manager.save(annaBen);

  // Seed Cards
  const annaCard = AppDataSource.manager.create(Card, {
    userId: anna.id,
    lastFourDigits: '4242',
    cardholderName: 'ANNA KOWALSKI',
    expiryDate: '12/26',
    status: CardStatus.ACTIVE,
    type: CardType.DEBIT,
  });
  await AppDataSource.manager.save(annaCard);

  // Seed Transactions
  const annaTxs = [
    {
      userId: anna.id,
      reference: 'WP-20260816-001',
      recipient: 'Rajesh Sharma',
      amount: 500.0,
      currency: Currency.EUR,
      senderAmount: 500.0,
      senderCurrency: Currency.EUR,
      recipientAmount: 45250.0,
      recipientCurrency: Currency.INR,
      fee: 25.0,
      exchangeRate: 90.5,
      status: TransactionStatus.COMPLETED,
      date: new Date('2026-08-16T10:00:00Z'),
    },
    {
      userId: anna.id,
      reference: 'WP-20260815-002',
      recipient: 'Priya Patel',
      amount: 250.0,
      currency: Currency.EUR,
      senderAmount: 250.0,
      senderCurrency: Currency.EUR,
      recipientAmount: 22625.0,
      recipientCurrency: Currency.INR,
      fee: 25.0,
      exchangeRate: 90.5,
      status: TransactionStatus.PROCESSING,
      date: new Date('2026-08-15T10:00:00Z'),
    },
    {
      userId: anna.id,
      reference: 'WP-20260814-003',
      recipient: 'Marie Dubois',
      amount: 1000.0,
      currency: Currency.EUR,
      senderAmount: 1000.0,
      senderCurrency: Currency.EUR,
      recipientAmount: 1000.0,
      recipientCurrency: Currency.EUR,
      fee: 25.0,
      exchangeRate: 1.0,
      status: TransactionStatus.PENDING,
      date: new Date('2026-08-14T10:00:00Z'),
    },
    {
      userId: anna.id,
      reference: 'WP-20260813-004',
      recipient: 'Rajesh Sharma',
      amount: 1500.0,
      currency: Currency.EUR,
      senderAmount: 1500.0,
      senderCurrency: Currency.EUR,
      recipientAmount: 135750.0,
      recipientCurrency: Currency.INR,
      fee: 25.0,
      exchangeRate: 90.5,
      status: TransactionStatus.FAILED,
      failureReason: 'Beneficiary bank account verification failed',
      date: new Date('2026-08-13T10:00:00Z'),
    },
  ].map((tx) => AppDataSource.manager.create(Transaction, tx));

  const tariqTxs = [
    {
      userId: tariq.id,
      reference: 'WP-20260816-101',
      recipient: 'John Smith',
      amount: 5000.0,
      currency: Currency.AED,
      senderAmount: 5000.0,
      senderCurrency: Currency.AED,
      recipientAmount: 1360.54,
      recipientCurrency: Currency.USD,
      fee: 50.0,
      exchangeRate: 0.2721,
      status: TransactionStatus.COMPLETED,
      date: new Date('2026-08-16T14:30:00Z'),
    },
  ].map((tx) => AppDataSource.manager.create(Transaction, tx));

  await AppDataSource.manager.save([...annaTxs, ...tariqTxs]);

  console.log('Seed complete.');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

