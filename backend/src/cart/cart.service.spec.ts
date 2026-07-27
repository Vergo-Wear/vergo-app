import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';

describe('CartService product visibility', () => {
  const customer = { findFirst: jest.fn() };
  const cart = { findFirst: jest.fn() };
  const cartItem = { findMany: jest.fn() };
  const productVariant = { findMany: jest.fn(), findFirst: jest.fn() };
  const transaction = jest.fn();
  const service = new CartService({
    customer,
    cart,
    cartItem,
    productVariant,
    $transaction: transaction,
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    customer.findFirst.mockResolvedValue({ customerId: 'customer-1' });
    cart.findFirst.mockResolvedValue({ cartId: 'cart-1' });
  });

  it('shows held cart products with zero customer-facing stock', async () => {
    cartItem.findMany.mockResolvedValue([
      {
        quantity: 1,
        variant: {
          variantId: 'variant-1',
          sku: 'VG-TEE-M',
          status: 'show',
          priceAdjustment: 0,
          product: {
            productId: 'product-1',
            name: 'Tee',
            description: null,
            basePrice: 4000,
            status: 'hold',
            category: { name: 'T-Shirts' },
          },
          color: { name: 'Black' },
          size: { name: 'M' },
          images: [],
          inventory: [
            { quantity: 12, stockReservations: [{ quantity: 2 }] },
          ],
        },
      },
    ]);

    const result = await service.get('profile-1');

    expect(result.items[0].product.isAvailable).toBe(false);
    expect(result.items[0].product.variants[0].availableQuantity).toBe(0);
  });

  it('does not return hidden products from an existing cart', async () => {
    cartItem.findMany.mockResolvedValue([
      {
        quantity: 1,
        variant: {
          variantId: 'variant-1',
          sku: 'VG-TEE-M',
          status: 'show',
          priceAdjustment: 0,
          product: {
            productId: 'product-1',
            name: 'Tee',
            description: null,
            basePrice: 4000,
            status: 'hidden',
            category: { name: 'T-Shirts' },
          },
          color: { name: 'Black' },
          size: { name: 'M' },
          images: [],
          inventory: [],
        },
      },
    ]);

    await expect(service.get('profile-1')).resolves.toEqual({ items: [] });
  });

  it('rejects held products when saving a cart', async () => {
    productVariant.findMany.mockResolvedValue([]);

    await expect(
      service.save('profile-1', {
        items: [
          {
            product: {
              id: 'product-1',
              variants: [
                {
                  variantId: 'variant-1',
                  size: 'M',
                  color: 'Black',
                },
              ],
            },
            size: 'M',
            color: 'Black',
            quantity: 1,
          },
        ],
      } as never),
    ).rejects.toThrow(
      new BadRequestException(
        'One or more products are not currently available for purchase.',
      ),
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not return a hidden variant from an existing cart', async () => {
    cartItem.findMany.mockResolvedValue([
      {
        quantity: 1,
        variant: {
          variantId: 'variant-1',
          sku: 'VG-TEE-M',
          status: 'hidden',
          priceAdjustment: 0,
          product: {
            productId: 'product-1',
            name: 'Tee',
            description: null,
            basePrice: 4000,
            status: 'live',
            category: { name: 'T-Shirts' },
          },
          color: { name: 'Black' },
          size: { name: 'M' },
          images: [],
          inventory: [{ quantity: 12, stockReservations: [] }],
        },
      },
    ]);

    await expect(service.get('profile-1')).resolves.toEqual({ items: [] });
  });
});
