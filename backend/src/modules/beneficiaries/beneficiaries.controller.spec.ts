import { Test, TestingModule } from '@nestjs/testing';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { BeneficiaryPayoutMethod } from './entities/beneficiary.entity';

describe('BeneficiariesController', () => {
  let controller: BeneficiariesController;
  let beneficiariesService: jest.Mocked<Partial<BeneficiariesService>>;

  const mockBeneficiary = {
    id: 'b-1',
    userId: 'user-1',
    name: 'Jane Doe',
    payoutMethod: BeneficiaryPayoutMethod.BANK_ACCOUNT,
    accountNumber: 'FR7630006000011234567890189',
    isActive: true,
  };

  beforeEach(async () => {
    beneficiariesService = {
      getBeneficiariesByUserId: jest.fn().mockResolvedValue([mockBeneficiary]),
      create: jest.fn().mockResolvedValue(mockBeneficiary),
      deleteBeneficiary: jest.fn().mockResolvedValue({ success: true, message: 'Beneficiary deleted successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BeneficiariesController],
      providers: [
        {
          provide: BeneficiariesService,
          useValue: beneficiariesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BeneficiariesController>(BeneficiariesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getMyBeneficiaries to beneficiariesService', async () => {
    const result = await controller.getMyBeneficiaries({ id: 'user-1' });
    expect(beneficiariesService.getBeneficiariesByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([mockBeneficiary]);
  });

  it('should delegate createBeneficiary to beneficiariesService', async () => {
    const dto = { name: 'Jane Doe', payoutMethod: BeneficiaryPayoutMethod.BANK_ACCOUNT, accountNumber: 'FR7630006000011234567890189' };
    const result = await controller.createBeneficiary({ id: 'user-1' }, dto as any);
    expect(beneficiariesService.create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(mockBeneficiary);
  });

  it('should delegate deleteBeneficiary to beneficiariesService', async () => {
    const result = await controller.deleteBeneficiary({ id: 'user-1' }, 'b-1');
    expect(beneficiariesService.deleteBeneficiary).toHaveBeenCalledWith('user-1', 'b-1');
    expect(result).toEqual({ success: true, message: 'Beneficiary deleted successfully' });
  });
});
