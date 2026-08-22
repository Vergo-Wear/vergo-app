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
    expect(result.analytics.nextYearForecast.predictedRevenue).toBeGreaterThan(
      0,
    );
  });
});

describe('AdminService supplier management', () => {
  const supplier = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const service = new AdminService({ supplier } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    supplier.findFirst.mockResolvedValue(null);
  });

  it('creates a normalized active supplier', async () => {
    supplier.create.mockImplementation(({ data }) => ({
      supplierId: 'a2dbe02f-df41-4f5c-aad6-2387529d17b6',
      ...data,
    }));

    await expect(
      service.createSupplier({
        name: '  Apex Textiles  ',
        phone: ' 0771234567 ',
        email: ' SALES@APEX.LK ',
        address: ' 12 Main Street ',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        name: 'Apex Textiles',
        phone: '0771234567',
        email: 'sales@apex.lk',
        address: '12 Main Street',
        status: 'Active',
      }),
    );
  });

  it('rejects a duplicate supplier email', async () => {
    supplier.findFirst.mockResolvedValue({
      supplierId: 'a2dbe02f-df41-4f5c-aad6-2387529d17b6',
    });

    await expect(
      service.createSupplier({
        name: 'Apex Textiles',
        phone: '0771234567',
        email: 'sales@apex.lk',
        address: '12 Main Street',
      }),
    ).rejects.toThrow('A supplier with this email already exists.');
    expect(supplier.create).not.toHaveBeenCalled();
  });

  it('updates an existing supplier status', async () => {
    supplier.findUnique.mockResolvedValue({
      supplierId: 'a2dbe02f-df41-4f5c-aad6-2387529d17b6',
    });
    supplier.update.mockResolvedValue({
      supplierId: 'a2dbe02f-df41-4f5c-aad6-2387529d17b6',
      status: 'Inactive',
    });

    await expect(
      service.updateSupplier('a2dbe02f-df41-4f5c-aad6-2387529d17b6', {
        status: 'Inactive',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'Inactive',
      }),
    );
  });
});

describe('AdminService branch management', () => {
  const branch = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const service = new AdminService({ branch } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    branch.findFirst.mockResolvedValue(null);
  });

  it('lists branches with employee, inventory, and order counts', async () => {
    branch.findMany.mockResolvedValue([
      {
        branchId: 'e26540e1-f52b-4fe7-85c4-282c16d36b6b',
        name: 'Delkanda',
        address: 'High Level Road',
        phone: '0771234567',
        _count: { employees: 2, inventory: 3, orders: 4 },
      },
    ]);

    await expect(service.listBranches()).resolves.toEqual([
      expect.objectContaining({
        name: 'Delkanda',
        _count: { employees: 2, inventory: 3, orders: 4 },
      }),
    ]);
    expect(branch.findMany).toHaveBeenCalledWith({
      include: {
        _count: {
          select: { employees: true, inventory: true, orders: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  });

  it('creates a trimmed database branch', async () => {
    branch.create.mockImplementation(({ data }) => ({
      branchId: 'e26540e1-f52b-4fe7-85c4-282c16d36b6b',
      ...data,
    }));

    await expect(
      service.createBranch({
        name: ' Delkanda ',
        address: ' High Level Road ',
        phone: ' 0771234567 ',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        name: 'Delkanda',
        address: 'High Level Road',
        phone: '0771234567',
      }),
    );
  });

  it('rejects a duplicate branch name', async () => {
    branch.findFirst.mockResolvedValue({
      branchId: 'e26540e1-f52b-4fe7-85c4-282c16d36b6b',
    });

    await expect(
      service.createBranch({
        name: 'Delkanda',
        address: 'High Level Road',
        phone: '0771234567',
      }),
    ).rejects.toThrow('A branch with this name already exists.');
    expect(branch.create).not.toHaveBeenCalled();
  });
});

describe('AdminService database-backed inventory', () => {
  const category = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const supplier = { findMany: jest.fn() };
  const branch = { findMany: jest.fn() };
  const color = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const size = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const product = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  };
  const productVariant = { create: jest.fn() };
  const images = { findFirst: jest.fn() };
  const inventory = { findUnique: jest.fn(), update: jest.fn() };
  const queryRawUnsafe = jest.fn();
  const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
    callback({
      category,
      supplier,
      branch,
      color,
      size,
      product,
      productVariant,
      images,
      inventory,
      $queryRawUnsafe: queryRawUnsafe,
    }),
  );
  const service = new AdminService({
    category,
    supplier,
    branch,
    color,
    size,
    product,
    productVariant,
    inventory,
    $queryRawUnsafe: queryRawUnsafe,
    $transaction: transaction,
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    category.findMany.mockResolvedValue([]);
    supplier.findMany.mockResolvedValue([]);
    branch.findMany.mockResolvedValue([]);
    color.findMany.mockResolvedValue([]);
    color.findFirst.mockResolvedValue(null);
    size.findMany.mockResolvedValue([]);
    size.findFirst.mockResolvedValue(null);
    product.findMany.mockResolvedValue([]);
    product.findFirst.mockResolvedValue(null);
    product.findUnique.mockResolvedValue({ productId: 'product-1' });
    images.findFirst.mockResolvedValue(null);
    queryRawUnsafe.mockResolvedValue([]);
  });

  it('returns branch stock with reserved and available quantities', async () => {
    product.findMany.mockResolvedValue([
      {
        productId: 'product-1',
        categoryId: 'category-1',
        supplierId: 'supplier-1',
        name: 'Utility Shirt',
        description: 'Ripstop shirt',
        basePrice: 5000,
        status: 'live',
        createdAt: new Date('2026-07-25T00:00:00.000Z'),
        category: { name: 'Shirts' },
        supplier: { name: 'Apex Textiles' },
        variants: [
          {
            variantId: 'variant-1',
            sku: 'VGO-SHIRT-BLK-M',
            status: 'show',
            sizeId: 'size-1',
            size: { name: 'M' },
            colorId: 'color-1',
            color: { name: 'Black' },
            priceAdjustment: 500,
            images: [{ imageUrl: 'https://example.com/shirt.jpg' }],
            inventory: [
              {
                inventoryId: 'inventory-1',
                branchId: 'branch-1',
                branch: { name: 'Colombo' },
                quantity: 12,
                reorderLevel: 5,
                lastUpdated: new Date('2026-07-26T00:00:00.000Z'),
                stockReservations: [{ quantity: 3 }],
              },
            ],
          },
        ],
      },
    ]);

    const result = await service.inventoryCatalog();

    expect(result.items).toEqual([
      expect.objectContaining({
        sku: 'VGO-SHIRT-BLK-M',
        branchName: 'Colombo',
        quantity: 12,
        reservedQuantity: 3,
        availableQuantity: 9,
        sellingPrice: 5500,
        status: 'live',
        variantStatus: 'show',
        createdAt: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ]);
  });

  it('prevents stock from being reduced below active reservations', async () => {
    inventory.findUnique.mockResolvedValue({
      inventoryId: 'inventory-1',
      stockReservations: [{ quantity: 4 }, { quantity: 2 }],
    });

    await expect(service.updateInventory('inventory-1', 5)).rejects.toThrow(
      'Quantity cannot be lower than 6 reserved units.',
    );
    expect(inventory.update).not.toHaveBeenCalled();
  });

  it('creates branch-level stock with its reorder level', async () => {
    product.create.mockResolvedValue({ productId: 'product-1' });
    color.findFirst.mockResolvedValue({ colorId: 'color-1' });
    size.findFirst.mockResolvedValue({ sizeId: 'size-1' });

    await service.createProduct({
      name: 'Utility Shirt',
      supplierId: '7c1f343c-93de-49a8-b1fa-a40dfb321ee6',
      basePrice: 5000,
      status: 'live',
      variants: [
        {
          sku: 'VGO-SHIRT-BLK-M',
          color: 'Black',
          size: 'M',
          priceAdjustment: 500,
          quantity: 12,
          branchId: 'e26540e1-f52b-4fe7-85c4-282c16d36b6b',
          reorderLevel: 5,
        },
      ],
    });

    expect(productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventory: {
            create: expect.objectContaining({
              quantity: 12,
              branchId: 'e26540e1-f52b-4fe7-85c4-282c16d36b6b',
              reorderLevel: 5,
            }),
          },
          status: 'show',
        }),
      }),
    );
  });

  it('creates a reusable color option for product dropdowns', async () => {
    color.create.mockResolvedValue({
      colorId: '69c22c8a-7eb0-4fb7-bf31-f79cb17d2818',
      name: 'Olive',
      hexCode: null,
      displayOrder: 2,
      status: 'Active',
    });

    await service.createColor({
      name: ' Olive ',
      displayOrder: 2,
    });

    expect(color.create).toHaveBeenCalledWith({
      data: {
        name: 'Olive',
        hexCode: null,
        imageUrl: null,
        displayOrder: 2,
        status: 'Active',
      },
    });
  });
});
