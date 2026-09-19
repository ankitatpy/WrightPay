import { DataSource } from 'typeorm';
import { User } from './backend/src/modules/users/entities/user.entity';
import { Wallet } from './backend/src/modules/wallets/entities/wallet.entity';
import { Beneficiary } from './backend/src/modules/beneficiaries/entities/beneficiary.entity';
import { Card } from './backend/src/modules/cards/entities/card.entity';
import { Transaction } from './backend/src/modules/transactions/entities/transaction.entity';
import { EmailVerification } from './backend/src/modules/auth/entities/email-verification.entity';
import { ExchangeRate } from './backend/src/modules/exchange-rates/entities/exchange-rate.entity';

const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/wrightpay_db',
  entities: [User, Wallet, Beneficiary, Card, Transaction, EmailVerification, ExchangeRate],
  synchronize: false,
});

ds.initialize()
  .then(() => console.log('success'))
  .catch((e) => console.error(e));
