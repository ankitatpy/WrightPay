import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionsService: jest.Mocked<Partial<TransactionsService>>;

  const mockTransaction = {
    id: 'tx-1',
    reference: 'WP-20260919-ABCD1234',
    amount: 100,
    currency: 'EUR',
  };

  beforeEach(async () => {
    transactionsService = {
      getTransactions: jest.fn().mockResolvedValue({
        items: [mockTransaction as any],
        total: 1,
        limit: 10,
        offset: 0,
      }),
      getTransactionById: jest.fn().mockResolvedValue(mockTransaction as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: transactionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getMyTransactions to transactionsService', async () => {
    const query = { limit: 10, offset: 0 };
    const result = await controller.getMyTransactions({ id: 'user-1' }, query as any);
    expect(transactionsService.getTransactions).toHaveBeenCalledWith('user-1', query);
    expect(result.items).toHaveLength(1);
  });

  it('should delegate getTransactionById to transactionsService', async () => {
    const result = await controller.getTransactionById({ id: 'user-1' }, 'tx-1');
    expect(transactionsService.getTransactionById).toHaveBeenCalledWith('user-1', 'tx-1');
    expect(result).toEqual(mockTransaction);
  });
});
