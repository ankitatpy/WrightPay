import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Beneficiary, BeneficiaryPayoutMethod } from './entities/beneficiary.entity';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { Currency } from '../../core/enums/currency.enum';

export const MAX_BENEFICIARIES = 3;

@Injectable()
export class BeneficiariesService {
  constructor(
    @InjectRepository(Beneficiary)
    private readonly beneficiaryRepository: Repository<Beneficiary>,
  ) {}

  async getBeneficiariesByUserId(userId: string): Promise<Beneficiary[]> {
    return this.beneficiaryRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });
  }

  async create(userId: string, dto: CreateBeneficiaryDto): Promise<Beneficiary> {
    const activeCount = await this.beneficiaryRepository.count({
      where: { userId },
    });

    if (activeCount >= MAX_BENEFICIARIES) {
      throw new BadRequestException(`Maximum limit of ${MAX_BENEFICIARIES} active beneficiaries reached`);
    }

    const payoutMethod = dto.payoutMethod || BeneficiaryPayoutMethod.BANK_ACCOUNT;

    if (payoutMethod === BeneficiaryPayoutMethod.UPI) {
      if (dto.currency !== Currency.INR) {
        throw new BadRequestException('UPI payout method is only supported for INR currency');
      }
      if (!dto.upiId || !dto.upiId.trim()) {
        throw new BadRequestException('UPI ID is required for UPI payout method');
      }
    } else {
      if (!dto.accountNumber || !dto.accountNumber.trim()) {
        throw new BadRequestException('Account number is required for bank account payout method');
      }
    }

    const beneficiary = this.beneficiaryRepository.create({
      userId,
      name: dto.name.trim(),
      currency: dto.currency,
      payoutMethod,
      accountNumber: dto.accountNumber?.trim(),
      bankCode: dto.bankCode?.trim() || dto.ifscCode?.trim() || 'DIRECT',
      ifscCode: dto.ifscCode?.trim(),
      upiId: dto.upiId?.trim(),
      bankName: dto.bankName?.trim() || (payoutMethod === BeneficiaryPayoutMethod.UPI ? 'UPI' : 'Bank Account'),
    });

    return this.beneficiaryRepository.save(beneficiary);
  }

  async deleteBeneficiary(userId: string, id: string): Promise<{ message: string; id: string }> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { id, userId },
    });

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    await this.beneficiaryRepository.softDelete({ id, userId });

    return {
      message: 'Beneficiary successfully deleted',
      id,
    };
  }
}
