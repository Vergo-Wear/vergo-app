import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

const ACTIVE_ORDER_STATUSES = new Set(['cancelled', 'rejected']);

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

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
    const sum = (values: Array<{ orders: number; revenue: number }>, field: 'orders' | 'revenue') =>
      values.reduce((total, value) => total + value[field], 0);
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
        predictedOrders: Math.max(0, Math.round(baselineOrders * (1 + orderTrend))),
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
