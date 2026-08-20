import { IsString, IsNotEmpty, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../../../core/enums/currency.enum';

export class CreateTransferDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  beneficiaryId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  sourceWalletId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  sendAmount: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  destinationCurrency: Currency;
}
