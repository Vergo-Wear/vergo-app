import { AdminService } from './admin.service';

describe('AdminService analytics overview', () => {
  const inventory = { findMany: jest.fn() };
  const employee = { findMany: jest.fn() };
  const orders = { findMany: jest.fn() };
  const prisma = { inventory, employee, orders };

  beforeEach(() => {
    jest.clearAllMocks();
    inventory.findMany.mockResolvedValue([]);
    employee.findMany.mockResolvedValue([]);
  });

  it('groups unique customers by their latest shipping location and forecasts next year', async () => {
    const now = new Date();
    const earlier = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1),
    );
    const later = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    orders.findMany.mockResolvedValue([
      {
        customerId: 'customer-1',
        orderStatus: 'Delivered',
        orderDate: earlier,
        totalAmount: 1000,
        shippingDetails: {
          district: 'Colombo',
          city: 'Colombo 03',
          phone: '0771000000',
        },
      },
      {
        customerId: 'customer-1',
        orderStatus: 'Delivered',
        orderDate: later,
        totalAmount: 2000,
        shippingDetails: {
          district: 'Kandy',
          city: 'Kandy',
          phone: '0771000000',
        },
      },
      {
        customerId: null,
        orderStatus: 'Ready to Process',
        orderDate: later,
        totalAmount: 1500,
        shippingDetails: {
          district: 'Galle',
          city: 'Galle',
          phone: '0772000000',
        },
      },
      {
        customerId: 'cancelled-customer',
        orderStatus: 'Cancelled',
        orderDate: later,
        totalAmount: 5000,
        shippingDetails: {
          district: 'Jaffna',
          city: 'Jaffna',
          phone: '0773000000',
        },
      },
    ]);

    const result = await new AdminService(prisma as never).overview();

    expect(result.analytics.customerSummary).toEqual({
      totalCustomers: 2,
      districts: 3,
      cities: 3,
      coveredOrders: 3,
    });
    expect(result.analytics.customerDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          district: 'Kandy',
          customers: 1,
          percentage: 50,
        }),
        expect.objectContaining({
          district: 'Galle',
          customers: 1,
          percentage: 50,
        }),
        expect.objectContaining({
          district: 'Colombo',
          customers: 0,
        }),
      ]),
    );
    expect(result.analytics.nextYearForecast.year).toBe(
      now.getUTCFullYear() + 1,
    );
    expect(result.analytics.nextYearForecast.monthly).toHaveLength(12);
    expect(result.analytics.nextYearForecast.predictedRevenue).toBeGreaterThan(0);
  });
});
