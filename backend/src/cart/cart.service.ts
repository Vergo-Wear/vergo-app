import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCartDto } from './dto/save-cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCustomerId(profileId: string): Promise<string> {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
      select: { customerId: true },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    return customer.customerId;
  }

  private readonly itemInclude = {
    variant: {
      include: {
        product: { include: { category: true } },
        images: true,
        inventory: {
          include: {
            stockReservations: {
              where: { status: 'Active' },
              select: { quantity: true },
            },
          },
        },
      },
    },
  } as const;

  private mapItems(items: Awaited<ReturnType<CartService['loadItems']>>) {
    return items.flatMap((item) => {
      const variant = item.variant;
      const product = variant?.product;
      if (!variant || !product) return [];
      const availableQuantity = variant.inventory.reduce(
        (total, row) =>
          total +
          (row.quantity || 0) -
          row.stockReservations.reduce(
            (reserved, hold) => reserved + hold.quantity,
            0,
          ),
        0,
      );
      const price =
        Number(product.basePrice) + Number(variant.priceAdjustment || 0);
      const image = variant.images[0]?.imageUrl || '/logo.png';
      return [
        {
          product: {
            id: product.productId,
            name: product.name,
            price: `LKR ${price.toFixed(2)}`,
            lkrPrice: `LKR ${price.toFixed(2)}`,
            isAvailable: availableQuantity > 0,
            image,
            category: product.category?.name || 'Uncategorized',
            description: product.description || undefined,
            images: variant.images.map((entry) => entry.imageUrl),
            sizes: [variant.size],
            colors: [variant.color],
            variants: [
              {
                variantId: variant.variantId,
                sku: variant.sku,
                size: variant.size,
                color: variant.color,
                price,
                availableQuantity,
              },
            ],
          },
          size: variant.size,
          color: variant.color,
          quantity: item.quantity || 1,
        },
      ];
    });
  }

  private loadItems(cartId: string) {
    return this.prisma.cartItem.findMany({
      where: { cartId },
      include: this.itemInclude,
      orderBy: { cartItemId: 'asc' },
    });
  }

  async get(profileId: string) {
    const customerId = await this.getCustomerId(profileId);
    const cart = await this.prisma.cart.findFirst({ where: { customerId } });
    if (!cart) return { items: [] };
    return { items: this.mapItems(await this.loadItems(cart.cartId)) };
  }

  async save(profileId: string, dto: SaveCartDto) {
    const customerId = await this.getCustomerId(profileId);
    const variants = await Promise.all(
      dto.items.map(async (item) => {
        const product = item.product as {
          id?: unknown;
          variants?: Array<{
            variantId?: unknown;
            size?: unknown;
            color?: unknown;
          }>;
        };
        const selected = product.variants?.find(
          (variant) =>
            variant.size === item.size &&
            (!item.color || variant.color === item.color),
        );
        if (typeof selected?.variantId === 'string') return selected.variantId;
        if (typeof product.id !== 'string')
          throw new BadRequestException('Cart product ID is invalid.');
        const variant = await this.prisma.productVariant.findFirst({
          where: {
            productId: product.id,
            size: item.size,
            ...(item.color ? { color: item.color } : {}),
          },
          select: { variantId: true },
        });
        if (!variant)
          throw new BadRequestException(
            'Selected product variant no longer exists.',
          );
        return variant.variantId;
      }),
    );

    const cartId = await this.prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findFirst({ where: { customerId } });
      cart ??= await tx.cart.create({ data: { customerId } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
      if (dto.items.length) {
        // Collapse duplicate variants into a single row so the cart can
        // never hold two entries for the same product/size/colour.
        const quantityByVariant = new Map<string, number>();
        dto.items.forEach((item, index) => {
          const variantId = variants[index];
          quantityByVariant.set(
            variantId,
            Math.min(
              99,
              (quantityByVariant.get(variantId) ?? 0) + item.quantity,
            ),
          );
        });
        await tx.cartItem.createMany({
          data: [...quantityByVariant].map(([variantId, quantity]) => ({
            cartId: cart!.cartId,
            variantId,
            quantity,
          })),
        });
      }
      await tx.cart.update({
        where: { cartId: cart.cartId },
        data: { updatedAt: new Date() },
      });
      return cart.cartId;
    });
    return { items: this.mapItems(await this.loadItems(cartId)) };
  }

  async clear(profileId: string) {
    const customerId = await this.getCustomerId(profileId);
    const cart = await this.prisma.cart.findFirst({ where: { customerId } });
    if (cart)
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.cartId } });
    return { items: [] };
  }
}
