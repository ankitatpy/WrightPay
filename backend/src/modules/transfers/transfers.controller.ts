import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({
    summary: 'Initiate an atomic wallet-to-beneficiary transfer with Redis idempotency',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique client-generated idempotency key (e.g. UUID or string) preventing duplicate transfers',
    example: 'transfer-anna-001',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer successfully created and debited from wallet.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request / Missing Idempotency-Key / Insufficient balance / Invalid parameters.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden / Account suspended or closed.' })
  @ApiResponse({ status: 404, description: 'Source wallet or beneficiary not found.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict / Conflicting payload for idempotency key or concurrent processing.',
  })
  async create(
    @CurrentUser() user: { id: string },
    @Body() createTransferDto: CreateTransferDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return this.transfersService.create(user.id, createTransferDto, idempotencyKey);
  }
}
