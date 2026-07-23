import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService purchased-product rule', () => {
  const customerId = '9f3a2c83-1a28-4e4d-82b7-805c91642222';
  const productId = '47ca0439-d09e-4418-a16a-d2c2d4a2aaaa';
  const customer = { findFirst: jest.fn() };
  const orders = { findFirst: jest.fn() };
  const review = { findUnique: jest.fn(), create: jest.fn() };
  const prisma: any = {
    customer,
    orders,
    review,
    $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
  };
  let service: ReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewsService(prisma);
    customer.findFirst.mockResolvedValue({ customerId });
    orders.findFirst.mockResolvedValue({
      orderItems: [{ orderItemId: 'delivered-order-item' }],
    });
    review.findUnique.mockResolvedValue(null);
    review.create.mockResolvedValue({ reviewId: 'review-1' });
  });

  it('requires a delivered or completed purchase containing the product', async () => {
    await service.save('profile-1', productId, {
      rating: 5,
      comment: 'Excellent',
      images: [],
    });
    expect(orders.findFirst).toHaveBeenCalledWith({
      where: {
        customerId,
        orderStatus: { in: ['Delivered', 'Completed'] },
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
    expect(review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderItemId: 'delivered-order-item',
        }),
      }),
    );
  });

  it('rejects a review before a qualifying delivery exists', async () => {
    orders.findFirst.mockResolvedValue(null);
    await expect(
      service.save('profile-1', productId, {
        rating: 4,
        comment: 'Too early',
        images: [],
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(review.create).not.toHaveBeenCalled();
  });

  it('rejects a second review for the same customer and product', async () => {
    review.findUnique.mockResolvedValue({ reviewId: 'existing-review' });
    await expect(
      service.save('profile-1', productId, {
        rating: 4,
        comment: 'Again',
        images: [],
      }),
    ).rejects.toThrow(ConflictException);
    expect(review.create).not.toHaveBeenCalled();
  });
});
