import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('admin/reviews')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll() {
    return this.reviewsService.findAllForAdmin();
  }

  @Patch(':reviewId/toggle-visibility')
  toggleVisibility(
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.toggleVisibility(reviewId);
  }

  @Delete(':reviewId')
  remove(
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.deleteByAdmin(reviewId);
  }
}
