import {
  Body,
  Controller,
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
}
