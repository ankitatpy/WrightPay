import { IsNotEmpty, IsNumber, IsUUID, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../../../core/enums/currency.enum';

export class CreateTransferDto {
  @ApiProperty({
    description: 'UUID of the beneficiary receiving funds',
    example: '0a0ea84f-81fa-4ccc-9c93-dcf094ca9141',
  })
  @IsUUID()
  @IsNotEmpty()
  beneficiaryId: string;

  @ApiProperty({
    description: 'UUID of the authenticated user source wallet',
    example: '82e5e33a-4ac8-4897-834f-0ae927c78ae1',
  })
  @IsUUID()
  @IsNotEmpty()
  sourceWalletId: string;

  @ApiProperty({
    description: 'Amount to send in source wallet currency (must be greater than 0)',
    example: 100.0,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  sendAmount: number;

  @ApiProperty({
    description: 'Destination currency for payout',
    enum: Currency,
    example: Currency.INR,
  })
  @IsEnum(Currency)
  @IsNotEmpty()
  destinationCurrency: Currency;
}
