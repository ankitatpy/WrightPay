import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CardType } from '../entities/card.entity';

export class CreateCardDto {
  @ApiProperty({ example: 'ANNA KOWALSKI', description: 'Name of the cardholder' })
  @IsString()
  @IsNotEmpty()
  cardholderName: string;

  @ApiProperty({ enum: CardType, default: CardType.DEBIT, required: false })
  @IsEnum(CardType)
  @IsOptional()
  type?: CardType;

  @ApiProperty({ example: '4242424242424242', description: 'Card number (only last 4 digits are stored, full PAN is discarded)' })
  @IsString()
  @IsNotEmpty()
  cardNumber?: string;

  @ApiProperty({ example: '4242', required: false, description: 'Direct last 4 digits (optional override)' })
  @IsString()
  @IsOptional()
  lastFourDigits?: string;

  @ApiProperty({ example: '12/28', description: 'Expiry date in MM/YY format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, { message: 'expiryDate must be in MM/YY format (e.g. 12/28)' })
  expiryDate: string;

  @ApiProperty({ example: '123', required: false, description: 'CVV security code (never stored/persisted)' })
  @IsString()
  @IsOptional()
  cvv?: string;
}
