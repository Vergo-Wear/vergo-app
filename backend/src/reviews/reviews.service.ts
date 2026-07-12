import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveReviewDto } from './dto/save-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProduct(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((review) => ({
      id: review.reviewId,
      productId: review.productId,
      rating: review.rating,
      reviewerName: `${review.customer.firstName} ${review.customer.lastName.charAt(0)}.`,
      comment: review.comment,
      date: review.createdAt.toISOString(),
      images: Array.isArray(review.images) ? review.images : [],
      isVerified: true,
    }));
  }

  async save(profileId: string, productId: string, dto: SaveReviewDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    const review = await this.prisma.review.upsert({
      where: {
        productId_customerId: { productId, customerId: customer.customerId },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment.trim(),
        images: dto.images as Prisma.InputJsonValue,
      },
      create: {
        productId,
        customerId: customer.customerId,
        rating: dto.rating,
        comment: dto.comment.trim(),
        images: dto.images as Prisma.InputJsonValue,
      },
    });
    return review;
  }
}
