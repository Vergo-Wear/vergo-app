import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveReviewDto } from './dto/save-review.dto';

export function validateReviewModeration(comment: string): { isValid: boolean; reason?: string } {
  const text = comment.trim();
  if (!text || text.length < 8) {
    return { isValid: false, reason: 'Review comment must be at least 8 characters long.' };
  }

  // 1. Check for promotional links/URLs
  const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|xyz|top|online|ru|net|org|site|click))/i;
  if (urlPattern.test(text)) {
    return {
      isValid: false,
      reason: 'Promotional links, website URLs, and external domains are not permitted in product reviews.',
    };
  }

  // 2. Check for repeated character spam (e.g. "aaaaaa", "qwertyqwerty")
  const repeatedCharPattern = /(.)\1{5,}/i;
  if (repeatedCharPattern.test(text)) {
    return {
      isValid: false,
      reason: 'Review contains repetitive spam characters or gibberish. Please provide clear feedback.',
    };
  }

  // 3. Check for repeated word spam (e.g. "fake fake fake fake fake")
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = new Map<string, number>();
  let maxRepeatedWord = 0;
  for (const word of words) {
    if (word.length > 2) {
      const count = (wordCount.get(word) || 0) + 1;
      wordCount.set(word, count);
      if (count > maxRepeatedWord) maxRepeatedWord = count;
    }
  }
  if (words.length >= 5 && maxRepeatedWord / words.length > 0.5) {
    return {
      isValid: false,
      reason: 'Review contains repetitive spam phrases. Please provide constructive feedback.',
    };
  }

  // 4. Check for ALL CAPS shouting abuse (>15 chars, 90%+ uppercase)
  const lettersOnly = text.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length >= 15) {
    const uppercaseLetters = lettersOnly.replace(/[^A-Z]/g, '').length;
    if (uppercaseLetters / lettersOnly.length > 0.9) {
      return {
        isValid: false,
        reason: 'Excessive ALL-CAPS text detected. Please write your review using standard casing.',
      };
    }
  }

  // 5. Check for Hate Speech & Profanity
  const profanityList = [
    'bitch', 'bastard', 'cunt', 'fuck', 'fucking', 'fucker', 'shit', 'shitty', 'dick',
    'asshole', 'motherfucker', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'retard',
    'pussy', 'cock', 'crap', 'idiot', 'dumbass', 'bullshit'
  ];
  
  const textLower = text.toLowerCase();
  for (const word of profanityList) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(textLower)) {
      return {
        isValid: false,
        reason: 'Your review contains profane language or hate speech flagged by our content policy. Honest feedback is welcome, but please keep language respectful.',
      };
    }
  }

  return { isValid: true };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProduct(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, isHidden: false },
      include: { customer: true, images: true },
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((review) => ({
      id: review.reviewId,
      productId: review.productId,
      customerId: review.customerId,
      rating: review.rating,
      reviewerName: `${review.customer.firstName} ${review.customer.lastName.charAt(0)}.`,
      comment: review.comment,
      date: review.createdAt.toISOString(),
      images: review.images.map((image) => image.imageUrl),
      isVerified: true,
    }));
  }

  async findMineForProduct(profileId: string, productId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
    });
    if (!customer) return null;
    const review = await this.prisma.review.findUnique({
      where: {
        productId_customerId: { productId, customerId: customer.customerId },
      },
      include: { images: true },
    });
    if (!review) return null;
    return {
      id: review.reviewId,
      productId: review.productId,
      rating: review.rating,
      comment: review.comment,
      images: review.images.map((img) => img.imageUrl),
      date: review.createdAt.toISOString(),
    };
  }

  async checkEligibility(profileId: string, productId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
    });
    if (!customer) {
      return { canReview: false, hasCompletedOrder: false, hasExistingReview: false };
    }

    const existingReview = await this.prisma.review.findUnique({
      where: {
        productId_customerId: { productId, customerId: customer.customerId },
      },
      select: { reviewId: true },
    });

    const completedOrder = await this.prisma.orders.findFirst({
      where: {
        customerId: customer.customerId,
        orderStatus: { in: ['Delivered', 'Completed', 'delivered', 'completed', 'DELIVERED', 'COMPLETED'] },
        orderItems: { some: { variant: { productId } } },
      },
      select: { orderId: true },
    });

    const hasCompletedOrder = !!completedOrder;
    const hasExistingReview = !!existingReview;
    const canReview = hasCompletedOrder && !hasExistingReview;

    return { canReview, hasCompletedOrder, hasExistingReview };
  }

  async save(profileId: string, productId: string, dto: SaveReviewDto) {
    const moderation = validateReviewModeration(dto.comment);
    if (!moderation.isValid) {
      throw new BadRequestException(moderation.reason);
    }
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    return this.prisma.$transaction(async (tx) => {
      const purchased = await tx.orders.findFirst({
        where: {
          customerId: customer.customerId,
          orderStatus: { in: ['Delivered', 'Completed', 'delivered', 'completed', 'DELIVERED', 'COMPLETED'] },
          orderItems: { some: { variant: { productId } } },
        },
        orderBy: { orderDate: 'desc' },
        select: {
          orderItems: {
            where: { variant: { productId } },
            select: { orderItemId: true },
            take: 1,
          },
        },
      });
      const purchasedItem = purchased?.orderItems[0];
      if (!purchasedItem) {
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
        await tx.reviewImage.deleteMany({
          where: { reviewId: existing.reviewId },
        });
        return tx.review.update({
          where: { reviewId: existing.reviewId },
          data: {
            rating: dto.rating,
            comment: dto.comment.trim(),
            images: {
              create: dto.images.map((imageUrl) => ({ imageUrl })),
            },
          },
          include: { images: true },
        });
      }
      return tx.review.create({
        data: {
          productId,
          customerId: customer.customerId,
          orderItemId: purchasedItem.orderItemId,
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

  async removeMine(profileId: string, productId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');

    const existing = await this.prisma.review.findUnique({
      where: {
        productId_customerId: { productId, customerId: customer.customerId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Review not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.reviewImage.deleteMany({
        where: { reviewId: existing.reviewId },
      });
      return tx.review.delete({
        where: { reviewId: existing.reviewId },
      });
    });
  }

  async findAllForAdmin() {
    const reviews = await (this.prisma.review as any).findMany({
      include: { customer: true, product: true, images: true },
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((review: any) => ({
      id: review.reviewId,
      productId: review.productId,
      productName: review.product?.name || 'Unknown Product',
      productImage: review.product?.image || review.product?.images?.[0]?.imageUrl || '/logo.png',
      customerId: review.customerId,
      reviewerName: review.customer ? `${review.customer.firstName || ''} ${review.customer.lastName || ''}`.trim() : 'Customer',
      reviewerEmail: review.customer?.email || '',
      rating: review.rating,
      comment: review.comment,
      isHidden: review.isHidden ?? false,
      date: review.createdAt ? review.createdAt.toISOString() : new Date().toISOString(),
      images: (review.images || []).map((img: any) => typeof img === 'string' ? img : img.imageUrl),
    }));
  }

  async toggleVisibility(reviewId: string) {
    const existing = await this.prisma.review.findUnique({
      where: { reviewId },
    });
    if (!existing) throw new NotFoundException('Review not found.');
    return this.prisma.review.update({
      where: { reviewId },
      data: { isHidden: !existing.isHidden },
    });
  }

  async deleteByAdmin(reviewId: string) {
    const existing = await this.prisma.review.findUnique({
      where: { reviewId },
    });
    if (!existing) throw new NotFoundException('Review not found.');
    return this.prisma.$transaction(async (tx) => {
      await tx.reviewImage.deleteMany({ where: { reviewId } });
      return tx.review.delete({ where: { reviewId } });
    });
  }
}


