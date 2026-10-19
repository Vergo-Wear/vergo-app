import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { SaveReviewDto } from './dto/save-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ) {
    return this.reviewsService.findForProduct(productId);
  }

  @Get('eligibility')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  checkEligibility(
    @CurrentUser() profileId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ) {
    return this.reviewsService.checkEligibility(profileId, productId);
  }

  @Get('mine')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  findMine(
    @CurrentUser() profileId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ) {
    return this.reviewsService.findMineForProduct(profileId, productId);
  }

  @Put('mine')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  save(
    @CurrentUser() profileId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() dto: SaveReviewDto,
  ) {
    return this.reviewsService.save(profileId, productId, dto);
  }

  @Delete('mine')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  removeMine(
    @CurrentUser() profileId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ) {
    return this.reviewsService.removeMine(profileId, productId);
  }
}

