import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { GetTransactionsDto } from './dto/get-transactions.dto';

export interface FormattedTransaction {
  id: string;
  userId: string;
  reference: string;
  date: Date;
  recipient: string;
  amount: number;
  currency: string;
  senderAmount: number | null;
  senderCurrency: string | null;
  recipientAmount: number | null;
  recipientCurrency: string | null;
  fee: number;
  exchangeRate: number | null;
  status: string;
  failureReason: string | null;
  createdAt: Date;
}

export interface PaginatedTransactionsResponse {
  items: FormattedTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export function formatTransaction(tx: Transaction): FormattedTransaction {
  return {
    id: tx.id,
    userId: tx.userId,
    reference: tx.reference,
    date: tx.date || tx.createdAt,
    recipient: tx.recipient,
    amount: Number(tx.amount),
    currency: tx.currency,
    senderAmount: tx.senderAmount != null ? Number(tx.senderAmount) : null,
    senderCurrency: tx.senderCurrency || null,
    recipientAmount: tx.recipientAmount != null ? Number(tx.recipientAmount) : null,
    recipientCurrency: tx.recipientCurrency || null,
    fee: tx.fee != null ? Number(tx.fee) : 0,
    exchangeRate: tx.exchangeRate != null ? Number(tx.exchangeRate) : null,
    status: tx.status,
    failureReason: tx.failureReason || null,
    createdAt: tx.createdAt,
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async getTransactions(
    userId: string,
    dto: GetTransactionsDto = {},
  ): Promise<PaginatedTransactionsResponse> {
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;

    const qb = this.transactionRepository.createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId });

    if (dto.status) {
      qb.andWhere('tx.status = :status', { status: dto.status });
    }

    if (dto.reference && dto.reference.trim()) {
      qb.andWhere('(tx.reference ILIKE :ref OR tx.recipient ILIKE :ref)', {
        ref: `%${dto.reference.trim()}%`,
      });
    }

    qb.orderBy('tx.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map(formatTransaction),
      total,
      limit,
      offset,
    };
  }

  async getTransactionById(userId: string, id: string): Promise<FormattedTransaction> {
    const tx = await this.transactionRepository.findOne({
      where: { id, userId },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    return formatTransaction(tx);
  }
}
