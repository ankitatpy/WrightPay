import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../../../core/enums/currency.enum';

export class GetQuoteDto {
  @ApiProperty({ enum: Currency, example: Currency.EUR, description: 'Source currency' })
  @IsEnum(Currency)
  @IsNotEmpty()
  from: Currency;

  @ApiProperty({ enum: Currency, example: Currency.INR, description: 'Destination currency' })
  @IsEnum(Currency)
  @IsNotEmpty()
  to: Currency;

  @ApiProperty({ example: 100, description: 'Amount in source currency to convert' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;
}
