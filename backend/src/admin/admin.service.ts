import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [inventoryRows, employees, orders] = await Promise.all([
      this.prisma.inventory.findMany({
        include: { variant: { include: { product: true } } },
        orderBy: { lastUpdated: 'desc' },
      }),
      this.prisma.employee.findMany({ include: { profile: true } }),
      this.prisma.orders.findMany({ select: { orderStatus: true } }),
    ]);
    const inventory = inventoryRows.map((row) => ({
      inventoryId: row.inventoryId,
      sku: row.variant?.sku || 'UNASSIGNED',
      name: row.variant?.product?.name || 'Unassigned product',
      location: row.branchId || 'UNASSIGNED',
      inStock: row.quantity || 0,
      reorderLevel: row.reorderLevel || 0,
    }));
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
    };
  }

  async updateInventory(inventoryId: string, quantity: number) {
    const existing = await this.prisma.inventory.findUnique({
      where: { inventoryId },
    });
    if (!existing) throw new NotFoundException('Inventory record not found.');
    return this.prisma.inventory.update({
      where: { inventoryId },
      data: { quantity },
    });
  }

  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        categoryId: dto.categoryId || null,
        supplierId: dto.supplierId || null,
        basePrice: dto.basePrice,
        status: dto.status,
        variants: {
          create: dto.variants.map((variant) => ({
            sku: variant.sku.trim(),
            size: variant.size.trim(),
            color: variant.color.trim(),
            priceAdjustment: variant.priceAdjustment,
            inventory: { create: { quantity: variant.quantity } },
            ...(variant.imageUrl
              ? { images: { create: { imageUrl: variant.imageUrl } } }
              : {}),
          })),
        },
      },
      include: { variants: { include: { inventory: true, images: true } } },
    });
  }
}
