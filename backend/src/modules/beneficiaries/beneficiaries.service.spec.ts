import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { Beneficiary, BeneficiaryPayoutMethod } from './entities/beneficiary.entity';
import { Currency } from '../../core/enums/currency.enum';

describe('BeneficiariesService', () => {
  let service: BeneficiariesService;

  const mockBeneficiary: Partial<Beneficiary> = {
    id: 'ben-uuid-1',
    userId: 'user-uuid-1',
    name: 'Maria Rossi',
    currency: Currency.EUR,
    payoutMethod: BeneficiaryPayoutMethod.BANK_ACCOUNT,
    accountNumber: 'IT12A34567890',
    bankCode: 'UNCRITM1',
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'new-ben-id', ...dto })),
    save: jest.fn().mockImplementation((ben) => Promise.resolve({ id: 'saved-id', ...ben })),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeneficiariesService,
        {
          provide: getRepositoryToken(Beneficiary),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BeneficiariesService>(BeneficiariesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBeneficiariesByUserId', () => {
    it('should return list of user beneficiaries', async () => {
      mockRepository.find.mockResolvedValueOnce([mockBeneficiary]);
      const result = await service.getBeneficiariesByUserId('user-uuid-1');

      expect(result).toEqual([mockBeneficiary]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        order: { name: 'ASC' },
      });
    });
  });

  describe('create', () => {
    it('should create a bank account beneficiary successfully', async () => {
      mockRepository.count.mockResolvedValueOnce(1); // 1 existing, under limit of 3

      const dto = {
        name: 'John Doe',
        currency: Currency.EUR,
        payoutMethod: BeneficiaryPayoutMethod.BANK_ACCOUNT,
        accountNumber: 'DE1234567890',
        bankCode: 'DBKDEFF',
      };

      const result = await service.create('user-uuid-1', dto);
      expect(result).toBeDefined();
      expect(result.name).toBe('John Doe');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should create a UPI beneficiary with INR currency successfully', async () => {
      mockRepository.count.mockResolvedValueOnce(0);

      const dto = {
        name: 'Rohan Sharma',
        currency: Currency.INR,
        payoutMethod: BeneficiaryPayoutMethod.UPI,
        upiId: 'rohan@okhdfcbank',
      };

      const result = await service.create('user-uuid-1', dto);
      expect(result).toBeDefined();
      expect(result.upiId).toBe('rohan@okhdfcbank');
      expect(result.currency).toBe(Currency.INR);
    });

    it('should reject creation if max limit of 3 active beneficiaries is reached', async () => {
      mockRepository.count.mockResolvedValueOnce(3);

      const dto = {
        name: 'Extra Person',
        currency: Currency.EUR,
        accountNumber: 'FR7612345678',
      };

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject UPI beneficiary if currency is not INR', async () => {
      mockRepository.count.mockResolvedValueOnce(0);

      const dto = {
        name: 'Invalid UPI',
        currency: Currency.USD,
        payoutMethod: BeneficiaryPayoutMethod.UPI,
        upiId: 'user@upi',
      };

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject UPI beneficiary if upiId is missing', async () => {
      mockRepository.count.mockResolvedValueOnce(0);

      const dto = {
        name: 'Missing UPI ID',
        currency: Currency.INR,
        payoutMethod: BeneficiaryPayoutMethod.UPI,
      };

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject bank account beneficiary if accountNumber is missing', async () => {
      mockRepository.count.mockResolvedValueOnce(0);

      const dto = {
        name: 'Missing Account',
        currency: Currency.EUR,
        payoutMethod: BeneficiaryPayoutMethod.BANK_ACCOUNT,
      };

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteBeneficiary', () => {
    it('should soft delete user beneficiary', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockBeneficiary);

      const result = await service.deleteBeneficiary('user-uuid-1', 'ben-uuid-1');
      expect(result).toEqual({
        message: 'Beneficiary successfully deleted',
        id: 'ben-uuid-1',
      });
      expect(mockRepository.softDelete).toHaveBeenCalledWith({
        id: 'ben-uuid-1',
        userId: 'user-uuid-1',
      });
    });

    it('should throw NotFoundException if beneficiary not found for user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.deleteBeneficiary('user-uuid-1', 'ben-uuid-other'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
