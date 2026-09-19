import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { GetQuoteDto } from './dto/get-quote.dto';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available exchange rates' })
  @ApiResponse({ status: 200, description: 'Return all stored exchange rates.' })
  async getAllRates() {
    return this.exchangeRatesService.getAllRates();
  }

  @Get('quote')
  @ApiOperation({ summary: 'Calculate a currency conversion quote' })
  @ApiResponse({ status: 200, description: 'Return exchange rate quote.' })
  @ApiResponse({ status: 400, description: 'Bad Request / Invalid parameters.' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found.' })
  async getQuote(@Query() query: GetQuoteDto) {
    return this.exchangeRatesService.getQuote(query.from, query.to, query.amount);
  }
}
