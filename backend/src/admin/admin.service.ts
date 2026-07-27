import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateInventoryRecordDto } from './dto/update-inventory-record.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

const ACTIVE_ORDER_STATUSES = new Set(['cancelled', 'rejected']);

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  private async resolveVariantReferences(
    tx: Prisma.TransactionClient,
    variant: {
      colorId?: string;
      color?: string;
      sizeId?: string;
      size?: string;
    },
    current?: { colorId: string; sizeId: string },
  ) {
    const color = variant.colorId
      ? await tx.color.findFirst({
        where: {
          colorId: variant.colorId,
          ...(current?.colorId === variant.colorId
            ? {}
            : { status: 'Active' }),
        },
        select: { colorId: true },
      })
      : variant.color?.trim()
        ? await tx.color.findFirst({
          where: {
            name: {
              equals: variant.color.trim(),
              mode: 'insensitive',
            },
            status: 'Active',
          },
          select: { colorId: true },
        })
        : null;
    if (!color) {
      throw new BadRequestException(
        'Select a valid active color for every product variant.',
      );
    }

    const size = variant.sizeId
      ? await tx.size.findFirst({
        where: {
          sizeId: variant.sizeId,
          ...(current?.sizeId === variant.sizeId ? {} : { status: 'Active' }),
        },
        select: { sizeId: true },
      })
      : variant.size?.trim()
        ? await tx.size.findFirst({
          where: {
            name: {
              equals: variant.size.trim(),
              mode: 'insensitive',
            },
            status: 'Active',
          },
          select: { sizeId: true },
        })
        : null;
    if (!size) {
      throw new BadRequestException(
        'Select a valid active size for every product variant.',
      );
    }

    return { colorId: color.colorId, sizeId: size.sizeId };
  }

  async overview() {
    const [inventoryRows, employees, orders] = await Promise.all([
      this.prisma.inventory.findMany({
        include: { variant: { include: { product: true } } },
        orderBy: { lastUpdated: 'desc' },
      }),
      this.prisma.employee.findMany({ include: { profile: true } }),
      this.prisma.orders.findMany({
        select: {
          customerId: true,
          orderStatus: true,
          orderDate: true,
          totalAmount: true,
          shippingDetails: {
            select: { city: true, district: true, phone: true },
          },
        },
      }),
    ]);
    const inventory = inventoryRows.map((row) => ({
      inventoryId: row.inventoryId,
      sku: row.variant?.sku || 'UNASSIGNED',
      name: row.variant?.product?.name || 'Unassigned product',
      location: row.branchId || 'UNASSIGNED',
      inStock: row.quantity || 0,
      reorderLevel: row.reorderLevel || 0,
    }));
    const analyticsOrders = orders.filter(
      (order) =>
        !ACTIVE_ORDER_STATUSES.has(order.orderStatus?.toLowerCase() || ''),
    );
    const customerDistribution = this.customerDistribution(analyticsOrders);
    const nextYearForecast = this.nextYearForecast(analyticsOrders);

    return {
      inventory,
      employees: employees.map((employee) => ({
        id: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        position: employee.position,
        status: employee.profile?.status || 'inactive',
      })),
      stats: {
        completedUnits: orders.filter(
          (order) => order.orderStatus?.toLowerCase() === 'delivered',
        ).length,
        activeNodes: new Set(
          inventoryRows.map((row) => row.branchId).filter(Boolean),
        ).size,
        activeStaff: employees.filter(
          (employee) => employee.profile?.status === 'active',
        ).length,
        pendingShipments: orders.filter(
          (order) =>
            !['delivered', 'cancelled'].includes(
              order.orderStatus?.toLowerCase() || '',
            ),
        ).length,
      },
      analytics: {
        customerDistribution: customerDistribution.locations,
        customerSummary: customerDistribution.summary,
        nextYearForecast,
      },
    };
  }

  private customerDistribution(
    orders: Array<{
      customerId: string | null;
      orderDate: Date | null;
      totalAmount: unknown;
      shippingDetails: {
        city: string;
        district: string;
        phone: string;
      } | null;
    }>,
  ) {
    const locations = new Map<
      string,
      {
        district: string;
        city: string;
        customers: number;
        orders: number;
        revenue: number;
      }
    >();
    const latestCustomerLocation = new Map<
      string,
      { key: string; date: number }
    >();

    for (const order of orders) {
      const shipping = order.shippingDetails;
      if (!shipping) continue;
      const district = shipping.district.trim() || 'Unknown District';
      const city = shipping.city.trim() || 'Unknown City';
      const key = `${district.toLowerCase()}::${city.toLowerCase()}`;
      const current = locations.get(key) || {
        district,
        city,
        customers: 0,
        orders: 0,
        revenue: 0,
      };
      current.orders += 1;
      current.revenue += Number(order.totalAmount);
      locations.set(key, current);

      const identity = order.customerId || `guest:${shipping.phone.trim()}`;
      const date = order.orderDate?.getTime() || 0;
      const previous = latestCustomerLocation.get(identity);
      if (!previous || date >= previous.date) {
        latestCustomerLocation.set(identity, { key, date });
      }
    }

    for (const { key } of latestCustomerLocation.values()) {
      const location = locations.get(key);
      if (location) location.customers += 1;
    }

    const totalCustomers = latestCustomerLocation.size;
    const rows = [...locations.values()]
      .map((location) => ({
        ...location,
        revenue: Number(location.revenue.toFixed(2)),
        percentage:
          totalCustomers > 0
            ? Number(((location.customers / totalCustomers) * 100).toFixed(1))
            : 0,
      }))
      .sort(
        (left, right) =>
          right.customers - left.customers || right.orders - left.orders,
      );

    return {
      locations: rows,
      summary: {
        totalCustomers,
        districts: new Set(rows.map((row) => row.district)).size,
        cities: rows.length,
        coveredOrders: rows.reduce((sum, row) => sum + row.orders, 0),
      },
    };
  }

  private nextYearForecast(
    orders: Array<{
      orderDate: Date | null;
      totalAmount: unknown;
    }>,
  ) {
    const now = new Date();
    const forecastYear = now.getUTCFullYear() + 1;
    const monthlyHistory = new Map<
      string,
      { orders: number; revenue: number }
    >();

    for (const order of orders) {
      if (!order.orderDate) continue;
      const key = monthKey(order.orderDate);
      const current = monthlyHistory.get(key) || { orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += Number(order.totalAmount);
      monthlyHistory.set(key, current);
    }

    const trailingMonths = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1),
      );
      return monthlyHistory.get(monthKey(date)) || { orders: 0, revenue: 0 };
    });
    const previousHalf = trailingMonths.slice(0, 6);
    const recentHalf = trailingMonths.slice(6);
    const sum = (
      values: Array<{ orders: number; revenue: number }>,
      field: 'orders' | 'revenue',
    ) => values.reduce((total, value) => total + value[field], 0);
    const previousOrders = sum(previousHalf, 'orders');
    const recentOrders = sum(recentHalf, 'orders');
    const previousRevenue = sum(previousHalf, 'revenue');
    const recentRevenue = sum(recentHalf, 'revenue');
    const orderTrend = previousOrders
      ? clamp((recentOrders - previousOrders) / previousOrders, -0.3, 0.5)
      : 0;
    const revenueTrend = previousRevenue
      ? clamp((recentRevenue - previousRevenue) / previousRevenue, -0.3, 0.5)
      : 0;
    const overallOrderAverage = sum(trailingMonths, 'orders') / 12;
    const overallRevenueAverage = sum(trailingMonths, 'revenue') / 12;

    const monthly = Array.from({ length: 12 }, (_, monthIndex) => {
      const sameMonthHistory = [...monthlyHistory.entries()]
        .filter(([key]) => Number(key.slice(5, 7)) === monthIndex + 1)
        .map(([, value]) => value);
      const baselineOrders = sameMonthHistory.length
        ? sum(sameMonthHistory, 'orders') / sameMonthHistory.length
        : overallOrderAverage;
      const baselineRevenue = sameMonthHistory.length
        ? sum(sameMonthHistory, 'revenue') / sameMonthHistory.length
        : overallRevenueAverage;
      return {
        month: `${forecastYear}-${String(monthIndex + 1).padStart(2, '0')}`,
        predictedOrders: Math.max(
          0,
          Math.round(baselineOrders * (1 + orderTrend)),
        ),
        predictedRevenue: Math.max(
          0,
          Number((baselineRevenue * (1 + revenueTrend)).toFixed(2)),
        ),
      };
    });

    return {
      year: forecastYear,
      predictedOrders: monthly.reduce(
        (total, month) => total + month.predictedOrders,
        0,
      ),
      predictedRevenue: Number(
        monthly
          .reduce((total, month) => total + month.predictedRevenue, 0)
          .toFixed(2),
      ),
      orderTrendPercent: Number((orderTrend * 100).toFixed(1)),
      revenueTrendPercent: Number((revenueTrend * 100).toFixed(1)),
      methodology:
        'Historical monthly averages adjusted by the recent six-month trend, capped between -30% and +50%.',
      monthly,
    };
  }

  async inventoryCatalog() {
    const [categories, suppliers, branches, colors, sizes, products] =
      await Promise.all([
        this.prisma.category.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.supplier.findMany({
          orderBy: [{ status: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.branch.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.$queryRawUnsafe<any[]>(
          'SELECT color_id as "colorId", name, hex_code as "hexCode", image_url as "imageUrl", display_order as "displayOrder", status, created_at as "createdAt" FROM color ORDER BY display_order ASC, name ASC'
        ).then(colors => colors.map(c => ({
          colorId: c.colorId,
          name: c.name,
          hexCode: c.hexCode,
          imageUrl: c.imageUrl,
          displayOrder: Number(c.displayOrder),
          status: c.status,
          createdAt: c.createdAt
        }))),
        this.prisma.size.findMany({
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.product.findMany({
          include: {
            category: true,
            supplier: true,
            variants: {
              include: {
                color: true,
                size: true,
                images: { orderBy: { createdAt: 'asc' } },
                inventory: {
                  include: {
                    branch: true,
                    stockReservations: {
                      where: {
                        status: { in: ['Active', 'Pending Verification'] },
                      },
                      select: { quantity: true },
                    },
                  },
                  orderBy: { lastUpdated: 'desc' },
                },
              },
              orderBy: { sku: 'asc' },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
        }),
      ]);

    const items = products.flatMap((product) =>
      product.variants.flatMap<Record<string, unknown>>((variant) => {
        const common = {
          productId: product.productId,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          categoryName: product.category?.name || 'Unassigned',
          supplierId: product.supplierId,
          supplierName: product.supplier?.name || 'Unassigned',
          basePrice: Number(product.basePrice),
          status: product.status,
          createdAt: product.createdAt,
          variantId: variant.variantId,
          variantStatus: variant.status,
          sku: variant.sku,
          sizeId: variant.sizeId,
          size: variant.size.name,
          colorId: variant.colorId,
          color: variant.color.name,
          priceAdjustment: Number(variant.priceAdjustment || 0),
          sellingPrice:
            Number(product.basePrice) + Number(variant.priceAdjustment || 0),
          imageUrl: variant.images[0]?.imageUrl || null,
          images: variant.images.map((img) => img.imageUrl),
        };

        if (variant.inventory.length === 0) {
          return [
            {
              ...common,
              inventoryId: null,
              branchId: null,
              branchName: 'Unassigned',
              quantity: 0,
              reservedQuantity: 0,
              availableQuantity: 0,
              reorderLevel: 10,
              lastUpdated: null,
            },
          ];
        }

        return variant.inventory.map((inventory) => {
          const reservedQuantity = inventory.stockReservations.reduce(
            (total, reservation) => total + reservation.quantity,
            0,
          );
          return {
            ...common,
            inventoryId: inventory.inventoryId,
            branchId: inventory.branchId,
            branchName: inventory.branch?.name || 'Unassigned',
            quantity: inventory.quantity,
            reservedQuantity,
            availableQuantity: Math.max(
              0,
              inventory.quantity - reservedQuantity,
            ),
            reorderLevel: inventory.reorderLevel ?? 10,
            lastUpdated: inventory.lastUpdated,
          };
        });
      }),
    );

    return { categories, suppliers, branches, colors, sizes, items };
  }

  async updateInventory(inventoryId: string, quantity: number) {
    const existing = await this.prisma.inventory.findUnique({
      where: { inventoryId },
      include: {
        stockReservations: {
          where: { status: { in: ['Active', 'Pending Verification'] } },
          select: { quantity: true },
        },
      },
    });
    if (!existing) throw new NotFoundException('Inventory record not found.');
    const reservedQuantity = existing.stockReservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0,
    );
    if (quantity < reservedQuantity) {
      throw new BadRequestException(
        `Quantity cannot be lower than ${reservedQuantity} reserved units.`,
      );
    }
    return this.prisma.inventory.update({
      where: { inventoryId },
      data: { quantity },
    });
  }

  async updateInventoryRecord(
    inventoryId: string,
    dto: UpdateInventoryRecordDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: { inventoryId },
        include: {
          variant: {
            include: {
              product: true,
              images: { orderBy: { createdAt: 'asc' }, take: 1 },
            },
          },
          stockReservations: {
            where: { status: { in: ['Active', 'Pending Verification'] } },
            select: { quantity: true },
          },
        },
      });
      if (!existing) {
        throw new NotFoundException('Inventory record not found.');
      }

      const reservedQuantity = existing.stockReservations.reduce(
        (total, reservation) => total + reservation.quantity,
        0,
      );
      if (dto.quantity < reservedQuantity) {
        throw new BadRequestException(
          `Quantity cannot be lower than ${reservedQuantity} reserved units.`,
        );
      }

      const references = await this.resolveVariantReferences(
        tx,
        { colorId: dto.colorId, sizeId: dto.sizeId },
        {
          colorId: existing.variant.colorId,
          sizeId: existing.variant.sizeId,
        },
      );

      await tx.product.update({
        where: { productId: existing.variant.productId },
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          categoryId: dto.categoryId || null,
          supplierId: dto.supplierId,
          basePrice: dto.basePrice,
        },
      });
      await tx.productVariant.update({
        where: { variantId: existing.variantId },
        data: {
          sku: dto.sku.trim(),
          status: dto.variantStatus,
          sizeId: references.sizeId,
          colorId: references.colorId,
          priceAdjustment: dto.priceAdjustment,
        },
      });
      await tx.inventory.update({
        where: { inventoryId },
        data: {
          branchId: dto.branchId || null,
          quantity: dto.quantity,
          reorderLevel: dto.reorderLevel,
          lastUpdated: new Date(),
        },
      });

      if (dto.imageUrl) {
        const image = existing.variant.images[0];
        if (image) {
          await tx.images.update({
            where: { id: image.id },
            data: { imageUrl: dto.imageUrl },
          });
        } else {
          await tx.images.create({
            data: {
              variantId: existing.variantId,
              imageUrl: dto.imageUrl,
            },
          });
        }
      }

      return { inventoryId, updated: true };
    });
  }

  async createProduct(dto: CreateProductDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const references = await Promise.all(
          dto.variants.map((variant) =>
            this.resolveVariantReferences(tx, variant),
          ),
        );

        let product = await tx.product.findFirst({
          where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
          select: { productId: true },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              name: dto.name.trim(),
              description: dto.description?.trim(),
              categoryId: dto.categoryId || null,
              supplierId: dto.supplierId || null,
              basePrice: dto.basePrice,
              status: dto.status,
            },
            select: { productId: true },
          });
        }

        for (let i = 0; i < dto.variants.length; i++) {
          const variantDto = dto.variants[i];
          const refs = references[i];

          const existingImage = await tx.images.findFirst({
            where: {
              variant: {
                productId: product.productId,
                colorId: refs.colorId,
              },
            },
          });

          const colorRows: any[] = refs.colorId
            ? await tx.$queryRawUnsafe(
                'SELECT image_url FROM color WHERE color_id = $1::uuid',
                refs.colorId,
              )
            : [];
          const colorImgUrl = colorRows[0]?.image_url;

          const explicitImgUrl = variantDto.imageUrl?.trim();
          const mainProductImgUrl = dto.imageUrl?.trim();
          const targetImgUrl = explicitImgUrl || colorImgUrl || mainProductImgUrl;
          const shouldCreateImage = Boolean(targetImgUrl) && (!existingImage || explicitImgUrl);

          await tx.productVariant.create({
            data: {
              productId: product.productId,
              sku: variantDto.sku.trim(),
              status: variantDto.status || 'show',
              sizeId: refs.sizeId,
              colorId: refs.colorId,
              priceAdjustment: variantDto.priceAdjustment,
              inventory: {
                create: {
                  quantity: variantDto.quantity,
                  branchId: variantDto.branchId || null,
                  reorderLevel: variantDto.reorderLevel ?? 10,
                },
              },
              ...(shouldCreateImage
                ? { images: { create: { imageUrl: targetImgUrl } } }
                : {}),
            },
          });
        }

        return tx.product.findUnique({
          where: { productId: product.productId },
          include: {
            variants: {
              include: { color: true, size: true, inventory: true, images: true },
            },
          },
        });
      });
    } catch (e: any) {
      if (e.code === 'P2002' && e.meta?.target?.includes('sku')) {
        throw new ConflictException(
          'A product variant with this exact Name, Color, and Size combination already exists. Please edit the existing variant in stock instead.',
        );
      }
      require('fs').appendFileSync('debug-crash.log', String(e?.stack || e) + '\n\n');
      throw e;
    }
  }

  async updateProductVisibility(productId: string, status: string) {
    if (!['live', 'hold', 'hidden'].includes(status)) {
      throw new BadRequestException(
        'Product status must be Live, Hold, or Hidden.',
      );
    }
    await this.prisma.product.update({
      where: { productId },
      data: { status },
    });
    return { success: true };
  }

  async updateColorGallery(productId: string, colorId: string, imageUrls: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: { productId, colorId },
        select: { variantId: true },
        orderBy: { sku: 'asc' },
      });
      if (!variant) throw new NotFoundException('Variant not found for this color.');

      await tx.images.deleteMany({ where: { variantId: variant.variantId } });

      if (imageUrls && imageUrls.length > 0) {
        await tx.images.createMany({
          data: imageUrls.slice(0, 5).map((url, index) => ({
            variantId: variant.variantId,
            imageUrl: url,
            title: index === 0 ? 'Main' : `Gallery ${index}`,
          })),
        });
      }
      return { success: true };
    });
  }

  async deleteProduct(productId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
          where: { productId },
          select: { variantId: true },
        });

        const variantIds = variants.map((v) => v.variantId);

        if (variantIds.length > 0) {
          await tx.images.deleteMany({
            where: { variantId: { in: variantIds } },
          });

          await tx.inventory.deleteMany({
            where: { variantId: { in: variantIds } },
          });

          await tx.productVariant.deleteMany({
            where: { productId },
          });
        }

        await tx.product.delete({
          where: { productId },
        });
      });
      return { success: true };
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete this product because it is tied to historical customer orders or active inventory commitments.',
        );
      }
      throw error;
    }
  }

  async createCategory(dto: CreateCategoryDto) {
    const duplicate = await this.prisma.category.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
      select: { categoryId: true },
    });
    if (duplicate) {
      throw new ConflictException('A category with this name already exists.');
    }
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
    });
  }

  async updateCategory(categoryId: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { categoryId },
      select: { categoryId: true },
    });
    if (!existing) throw new NotFoundException('Category not found.');

    if (dto.name) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          categoryId: { not: categoryId },
          name: { equals: dto.name.trim(), mode: 'insensitive' },
        },
        select: { categoryId: true },
      });
      if (duplicate) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }
    }

    return this.prisma.category.update({
      where: { categoryId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      },
    });
  }

  async deleteCategory(categoryId: string) {
    try {
      await this.prisma.category.delete({ where: { categoryId } });
      return { success: true };
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete this category because it is used by active products. Please remove the products first.');
      }
      throw error;
    }
  }

  async createColor(dto: CreateColorDto) {
    const name = dto.name.trim();
    const duplicate = await this.prisma.color.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
      select: { colorId: true },
    });
    if (duplicate) {
      throw new ConflictException('A color with this name already exists.');
    }

    return (this.prisma.color.create as any)({
      data: {
        name: dto.name.trim(),
        hexCode: dto.hexCode?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        displayOrder: dto.displayOrder,
        status: dto.status || 'Active',
      },
    });
  }

  async updateColor(colorId: string, dto: UpdateColorDto) {
    const existing = await this.prisma.color.findUnique({
      where: { colorId },
      select: { colorId: true, name: true },
    });
    if (!existing) throw new NotFoundException('Color not found.');

    const name = dto.name?.trim() || existing.name;
    const duplicate = await this.prisma.color.findFirst({
      where: {
        colorId: { not: colorId },
        name: { equals: name, mode: 'insensitive' },
      },
      select: { colorId: true },
    });
    if (duplicate) {
      throw new ConflictException('A color with this name already exists.');
    }

    return (this.prisma.color.update as any)({
      where: { colorId },
      data: {
        ...(dto.name !== undefined ? { name } : {}),
        ...(dto.hexCode !== undefined ? { hexCode: dto.hexCode?.trim() || null } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl?.trim() || null } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async deleteColor(colorId: string) {
    try {
      await this.prisma.color.delete({ where: { colorId } });
      return { success: true };
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete this color because it is used by active products. Please remove the products first.');
      }
      throw error;
    }
  }

  async createSize(dto: CreateSizeDto) {
    const name = dto.name.trim();
    const duplicate = await this.prisma.size.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { sizeId: true },
    });
    if (duplicate) {
      throw new ConflictException('This size already exists.');
    }
    return this.prisma.size.create({
      data: {
        name,
        displayOrder: dto.displayOrder ?? 0,
        status: dto.status || 'Active',
      },
    });
  }

  async updateSize(sizeId: string, dto: UpdateSizeDto) {
    const existing = await this.prisma.size.findUnique({
      where: { sizeId },
    });
    if (!existing) throw new NotFoundException('Size not found.');

    const name = dto.name?.trim() || existing.name;
    const duplicate = await this.prisma.size.findFirst({
      where: {
        sizeId: { not: sizeId },
        name: { equals: name, mode: 'insensitive' },
      },
      select: { sizeId: true },
    });
    if (duplicate) {
      throw new ConflictException('This size already exists.');
    }

    return this.prisma.size.update({
      where: { sizeId },
      data: {
        ...(dto.name !== undefined ? { name } : {}),
        ...(dto.displayOrder !== undefined
          ? { displayOrder: dto.displayOrder }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async deleteSize(sizeId: string) {
    try {
      await this.prisma.size.delete({ where: { sizeId } });
      return { success: true };
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete this size because it is used by active products. Please remove the products first.');
      }
      throw error;
    }
  }

  listBranches() {
    return this.prisma.branch.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            inventory: true,
            orders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createBranch(dto: CreateBranchDto) {
    const name = dto.name.trim();
    const duplicate = await this.prisma.branch.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { branchId: true },
    });
    if (duplicate) {
      throw new ConflictException('A branch with this name already exists.');
    }

    return this.prisma.branch.create({
      data: {
        name,
        address: dto.address.trim(),
        phone: dto.phone.trim(),
      },
    });
  }

  async updateBranch(branchId: string, dto: UpdateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { branchId },
      select: { branchId: true, name: true },
    });
    if (!existing) throw new NotFoundException('Branch not found.');

    const name = dto.name?.trim() || existing.name;
    const duplicate = await this.prisma.branch.findFirst({
      where: {
        branchId: { not: branchId },
        name: { equals: name, mode: 'insensitive' },
      },
      select: { branchId: true },
    });
    if (duplicate) {
      throw new ConflictException('A branch with this name already exists.');
    }

    return this.prisma.branch.update({
      where: { branchId },
      data: {
        ...(dto.name !== undefined ? { name } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
      },
    });
  }

  listSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async createSupplier(dto: CreateSupplierDto) {
    const email = dto.email.trim().toLowerCase();
    const duplicate = await this.prisma.supplier.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { supplierId: true },
    });
    if (duplicate) {
      throw new ConflictException('A supplier with this email already exists.');
    }

    return this.prisma.supplier.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        email,
        address: dto.address.trim(),
        status: dto.status || 'Active',
      },
    });
  }

  async updateSupplier(supplierId: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({
      where: { supplierId },
      select: { supplierId: true },
    });
    if (!existing) throw new NotFoundException('Supplier not found.');

    const email = dto.email?.trim().toLowerCase();
    if (email) {
      const duplicate = await this.prisma.supplier.findFirst({
        where: {
          supplierId: { not: supplierId },
          email: { equals: email, mode: 'insensitive' },
        },
        select: { supplierId: true },
      });
      if (duplicate) {
        throw new ConflictException(
          'A supplier with this email already exists.',
        );
      }
    }

    return this.prisma.supplier.update({
      where: { supplierId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }
}
