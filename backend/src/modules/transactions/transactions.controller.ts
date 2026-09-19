import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated and filtered transactions for authenticated user' })
  @ApiResponse({ status: 200, description: 'Return paginated transactions list.' })
  @ApiResponse({ status: 400, description: 'Bad Request / Invalid query parameters.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyTransactions(
    @CurrentUser() user: { id: string },
    @Query() query: GetTransactionsDto,
  ) {
    return this.transactionsService.getTransactions(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single transaction details for authenticated user' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Return transaction details.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  async getTransactionById(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.transactionsService.getTransactionById(user.id, id);
  }
}
