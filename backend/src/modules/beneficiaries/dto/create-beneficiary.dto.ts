import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../../../core/enums/currency.enum';
import { BeneficiaryPayoutMethod } from '../entities/beneficiary.entity';

export class CreateBeneficiaryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ enum: BeneficiaryPayoutMethod, required: false })
  @IsOptional()
  @IsEnum(BeneficiaryPayoutMethod)
  payoutMethod?: BeneficiaryPayoutMethod;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.payoutMethod === BeneficiaryPayoutMethod.BANK_ACCOUNT)
  @IsNotEmpty()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.payoutMethod === BeneficiaryPayoutMethod.BANK_ACCOUNT)
  @IsNotEmpty()
  @IsString()
  bankCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ifscCode?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.payoutMethod === BeneficiaryPayoutMethod.UPI)
  @IsNotEmpty()
  @IsString()
  upiId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;
}
