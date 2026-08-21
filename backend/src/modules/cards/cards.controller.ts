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
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cards for authenticated user' })
  @ApiResponse({ status: 200, description: 'Return list of user cards.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyCards(@CurrentUser() user: { id: string }) {
    return this.cardsService.getCardsByUserId(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create/Tokenize a new card' })
  @ApiResponse({ status: 201, description: 'Card successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createCard(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCardDto,
  ) {
    return this.cardsService.create(user.id, dto);
  }

  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze an active card' })
  @ApiParam({ name: 'id', description: 'Card UUID' })
  @ApiResponse({ status: 200, description: 'Card successfully frozen.' })
  @ApiResponse({ status: 400, description: 'Card cannot be frozen.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Card not found.' })
  async freezeCard(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.cardsService.freezeCard(user.id, id);
  }

  @Post(':id/unfreeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfreeze a frozen card' })
  @ApiParam({ name: 'id', description: 'Card UUID' })
  @ApiResponse({ status: 200, description: 'Card successfully unfrozen.' })
  @ApiResponse({ status: 400, description: 'Card cannot be unfrozen.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Card not found.' })
  async unfreezeCard(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.cardsService.unfreezeCard(user.id, id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently deactivate a card' })
  @ApiParam({ name: 'id', description: 'Card UUID' })
  @ApiResponse({ status: 200, description: 'Card successfully deactivated.' })
  @ApiResponse({ status: 400, description: 'Card cannot be deactivated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Card not found.' })
  async deactivateCard(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.cardsService.deactivateCard(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a card' })
  @ApiParam({ name: 'id', description: 'Card UUID' })
  @ApiResponse({ status: 200, description: 'Card successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Card not found.' })
  async deleteCard(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.cardsService.deleteCard(user.id, id);
  }
}
