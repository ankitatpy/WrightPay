import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('beneficiaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active beneficiaries for authenticated user' })
  @ApiResponse({ status: 200, description: 'Return user active beneficiaries.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyBeneficiaries(@CurrentUser() user: { id: string }) {
    return this.beneficiariesService.getBeneficiariesByUserId(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new beneficiary (max 3 active per user)' })
  @ApiResponse({ status: 201, description: 'Beneficiary successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation error / Max limit reached.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createBeneficiary(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBeneficiaryDto,
  ) {
    return this.beneficiariesService.create(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a beneficiary' })
  @ApiParam({ name: 'id', description: 'Beneficiary UUID' })
  @ApiResponse({ status: 200, description: 'Beneficiary successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Beneficiary not found.' })
  async deleteBeneficiary(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.beneficiariesService.deleteBeneficiary(user.id, id);
  }
}
