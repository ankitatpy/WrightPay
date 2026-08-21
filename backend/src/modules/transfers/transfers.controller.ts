import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() createTransferDto: CreateTransferDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.transfersService.create(user.id, createTransferDto, idempotencyKey);
  }
}
