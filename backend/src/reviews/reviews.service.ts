import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveReviewDto } from './dto/save-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProduct(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: { customer: true, images: true },
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((review) => ({
      id: review.reviewId,
      productId: review.productId,
      rating: review.rating,
      reviewerName: `${review.customer.firstName} ${review.customer.lastName.charAt(0)}.`,
      comment: review.comment,
      date: review.createdAt.toISOString(),
      images: review.images.map((image) => image.imageUrl),
      isVerified: true,
    }));
  }

  async save(profileId: string, productId: string, dto: SaveReviewDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    return this.prisma.$transaction(async (tx) => {
      const purchased = await tx.orders.findFirst({
        where: {
          customerId: customer.customerId,
          orderStatus: { in: ['Delivered', 'Completed'] },
          orderItems: { some: { variant: { productId } } },
        },
        select: { orderId: true },
      });
      if (!purchased) {
        throw new ForbiddenException(
          'You can review this product after a purchased order is delivered.',
        );
      }
      const existing = await tx.review.findUnique({
        where: {
          productId_customerId: { productId, customerId: customer.customerId },
        },
        select: { reviewId: true },
      });
      if (existing) {
        throw new ConflictException(
          'You have already reviewed this product.',
        );
      }
      return tx.review.create({
        data: {
          productId,
          customerId: customer.customerId,
          rating: dto.rating,
          comment: dto.comment.trim(),
          images: {
            create: dto.images.map((imageUrl) => ({ imageUrl })),
          },
        },
        include: { images: true },
      });
    });
  }
}
