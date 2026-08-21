import { IsNotEmpty, IsNumber, IsString, IsEnum, Min } from 'class-validator';
import { Currency } from '../../../core/enums/currency.enum';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  beneficiaryId: string;

  @IsString()
  @IsNotEmpty()
  sourceWalletId: string;

  @IsNumber()
  @Min(0.01)
  sendAmount: number;

  @IsEnum(Currency)
  @IsNotEmpty()
  destinationCurrency: string;
}
