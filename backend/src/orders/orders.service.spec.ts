import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService normalized pending checkout lifecycle', () => {
  const profileId = '0b9adb71-9b7a-4a2f-9c3f-6a1d9dbb1111';
  const customerId = '9f3a2c83-1a28-4e4d-82b7-805c91642222';
  const checkoutId = '6b133395-0982-4201-8c62-3edc62b66666';
  const variantId = 'e335e75a-f87d-4937-a765-712f3ad93333';
  const orderId = '4be0cbd5-2f43-45ff-9f2c-1f0ce8ab4444';
  const orderItemId = '8ce20d49-4e37-4ab0-b80f-bc262b597777';

  const customer = { findUnique: jest.fn() };
  const productVariant = { findUnique: jest.fn() };
  const pendingCheckout = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const pendingCheckoutItem = { deleteMany: jest.fn(), createMany: jest.fn() };
  const pendingCheckoutCustomerDetails = { upsert: jest.fn() };
  const pendingCheckoutShippingDetails = { upsert: jest.fn() };
  const checkoutPaymentProof = { upsert: jest.fn(), deleteMany: jest.fn() };
  const orders = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const orderItem = { create: jest.fn() };
  const orderCustomerDetails = { create: jest.fn() };
  const orderShippingDetails = { create: jest.fn() };
  const cart = { findUnique: jest.fn() };
  const cartItem = { deleteMany: jest.fn() };
  const employee = { findFirst: jest.fn() };
  const stockReservation = { aggregate: jest.fn() };
  const inventory = { findFirst: jest.fn() };
  const userAddress = { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() };
  const profiles = { findUnique: jest.fn() };
  const prisma: any = {
    customer,
    productVariant,
    pendingCheckout,
    pendingCheckoutItem,
    pendingCheckoutCustomerDetails,
    pendingCheckoutShippingDetails,
    checkoutPaymentProof,
    orders,
    orderItem,
    orderCustomerDetails,
    orderShippingDetails,
    cart,
    cartItem,
    employee,
    stockReservation,
    inventory,
    userAddress,
    profiles,
    $executeRaw: jest.fn(),
    $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
  };
  const stockReservations = {
    lockCustomerCheckout: jest.fn(),
    reserveForCheckout: jest.fn(),
    releasePendingCheckout: jest.fn(),
    markPendingVerification: jest.fn(),
    commitPendingCheckout: jest.fn(),
    restoreCommittedForOrder: jest.fn(),
    expireActive: jest.fn(),
  };
  const notifications = {
    notifyOrderReady: jest.fn(),
    notifyCheckoutReviewed: jest.fn(),
  };

  const dto = (paymentMethod = 'cod'): CreateOrderDto => ({
    paymentMethod,
    deliveryFee: 350,
    contactDetails: {
      firstName: 'Julian',
      lastName: 'Verso',
      email: 'julian@example.com',
      phone: '0771234567',
    },
    shippingDetails: {
      receiverName: 'Julian Verso',
      phone: '0771234567',
      addressLine1: '12 Galle Road',
      addressLine2: 'Apt 4',
      city: 'Colombo',
      district: 'Colombo',
      postalCode: '10100',
      deliveryNote: 'Ring the bell',
    },
    items: [{ variantId, quantity: 2 }],
  });

  const includedCheckout = (overrides: Record<string, unknown> = {}) => ({
    checkoutId,
    customerId,
    paymentMethod: 'Cash on Delivery',
    status: 'Pending Confirmation',
    deliveryFee: new Prisma.Decimal(350),
    expiresAt: null,
    reviewedByProfileId: null,
    reviewedAt: null,
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        checkoutItemId: 'item-1',
        checkoutId,
        variantId,
        quantity: 2,
        unitPrice: new Prisma.Decimal(4750),
        variant: { variantId, sku: 'TEE-M', product: { basePrice: new Prisma.Decimal(4500) }, images: [] },
      },
    ],
    customerDetails: {
      detailId: 'detail-1',
      checkoutId,
      firstName: 'Julian',
      lastName: 'Verso',
      email: 'julian@example.com',
      phone: '0771234567',
    },
    shippingDetails: {
      shippingId: 'shipping-1',
      checkoutId,
      receiverName: 'Julian Verso',
      phone: '0771234567',
      addressLine1: '12 Galle Road',
      addressLine2: 'Apt 4',
      city: 'Colombo',
      district: 'Colombo',
      postalCode: '10100',
      deliveryNote: 'Ring the bell',
    },
    paymentProof: null,
    reservations: [],
    ...overrides,
  });

  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(
      prisma,
      { get: jest.fn() } as never,
      notifications as never,
      stockReservations as never,
    );
    customer.findUnique.mockResolvedValue({ customerId });
    productVariant.findUnique.mockResolvedValue({
      variantId,
      priceAdjustment: new Prisma.Decimal(250),
      product: { basePrice: new Prisma.Decimal(4500) },
    });
    pendingCheckout.findFirst.mockResolvedValue(null);
    pendingCheckout.create.mockResolvedValue({ checkoutId });
    pendingCheckout.findUnique.mockResolvedValue(includedCheckout());
    pendingCheckout.update.mockResolvedValue(includedCheckout());
    pendingCheckout.updateMany.mockResolvedValue({ count: 1 });
    cart.findUnique.mockResolvedValue(null);
    stockReservations.reserveForCheckout.mockResolvedValue([]);
    stockReservations.expireActive.mockResolvedValue({ count: 0 });
    profiles.findUnique.mockResolvedValue({ role: { roleName: 'Admin' } });
    orders.create.mockResolvedValue({
      orderId,
      checkoutId,
      customerId,
      paymentMethod: 'Cash on Delivery',
      orderStatus: 'Ready to Process',
      productTotal: new Prisma.Decimal(9500),
      deliveryFee: new Prisma.Decimal(350),
      totalAmount: new Prisma.Decimal(9850),
      orderDate: new Date(),
      employeeId: null,
    });
    orderItem.create.mockResolvedValue({
      orderItemId,
      orderId,
      variantId,
      quantity: 2,
      unitPrice: new Prisma.Decimal(4750),
      subtotal: new Prisma.Decimal(9500),
    });
  });

  it('stores a registered COD checkout in normalized rows without creating an order', async () => {
    const result = await service.create(dto(), profileId);

    expect(pendingCheckout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId,
        paymentMethod: 'Cash on Delivery',
        status: 'Pending Confirmation',
      }),
    });
    expect(pendingCheckoutItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ checkoutId, variantId, quantity: 2 })],
    });
    expect(pendingCheckoutCustomerDetails.upsert).toHaveBeenCalled();
    expect(pendingCheckoutShippingDetails.upsert).toHaveBeenCalled();
    expect(stockReservations.reserveForCheckout).toHaveBeenCalledWith(
      prisma,
      checkoutId,
      dto().items,
      null,
    );
    expect(orders.create).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ checkoutId, status: 'Pending Confirmation' }));
  });

  it('creates a guest COD checkout without a customer, cart, or saved address', async () => {
    await service.create(dto());
    expect(pendingCheckout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ customerId: null, paymentMethod: 'Cash on Delivery' }),
    });
    expect(userAddress.create).not.toHaveBeenCalled();
    expect(cart.findUnique).not.toHaveBeenCalled();
    expect(stockReservations.reserveForCheckout).toHaveBeenCalledWith(
      prisma,
      checkoutId,
      dto().items,
      null,
    );
  });

  it('creates Bank Transfer reservations owned by the new checkout', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    pendingCheckout.create.mockResolvedValue({ checkoutId, expiresAt });
    pendingCheckout.findUnique.mockResolvedValue(
      includedCheckout({
        paymentMethod: 'Bank Transfer',
        status: 'Awaiting Payment',
        expiresAt,
      }),
    );

    await service.create(dto('bank_transfer'), profileId);

    expect(stockReservations.reserveForCheckout).toHaveBeenCalledWith(
      prisma,
      checkoutId,
      dto('bank_transfer').items,
      expect.any(Date),
    );
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('changes an active Bank Transfer checkout to COD without changing checkout_id', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    pendingCheckout.findFirst.mockResolvedValue({ checkoutId, expiresAt });
    pendingCheckout.findUnique.mockResolvedValue(includedCheckout());

    const result = await service.create(dto('cod'), profileId);

    expect(stockReservations.reserveForCheckout).toHaveBeenCalledWith(
      prisma,
      checkoutId,
      dto('cod').items,
      null,
      true,
    );
    expect(stockReservations.releasePendingCheckout).not.toHaveBeenCalled();
    expect(checkoutPaymentProof.deleteMany).toHaveBeenCalledWith({ where: { checkoutId } });
    expect(pendingCheckout.update).toHaveBeenCalledWith({
      where: { checkoutId },
      data: expect.objectContaining({
        paymentMethod: 'Cash on Delivery',
        status: 'Pending Confirmation',
        expiresAt: null,
      }),
    });
    expect(result.checkoutId).toBe(checkoutId);
  });

  it('keeps the database expiry when a customer re-enters Bank Transfer', async () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    pendingCheckout.findFirst.mockResolvedValue(
      includedCheckout({ paymentMethod: 'Bank Transfer', status: 'Awaiting Payment', expiresAt }),
    );
    await expect(service.getCurrentBankTransferReservation(profileId)).resolves.toEqual(
      expect.objectContaining({ checkoutId, reservationId: checkoutId, expiresAt, status: 'Active' }),
    );
  });

  it('stores one receipt against the checkout and still creates no order', async () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    pendingCheckout.findFirst.mockResolvedValue({
      checkoutId,
      customerId,
      status: 'Awaiting Payment',
      paymentMethod: 'Bank Transfer',
      expiresAt,
      paymentProof: null,
    });
    pendingCheckout.findUnique.mockResolvedValue(
      includedCheckout({
        paymentMethod: 'Bank Transfer',
        status: 'Pending Verification',
        expiresAt,
        paymentProof: { receiptUrl: 'https://example.com/receipt.png', uploadedAt: new Date() },
      }),
    );

    await service.finalizeBankTransferReservation(profileId, checkoutId, dto('bank_transfer'), {
      receiptUrl: 'https://example.com/receipt.png',
      storagePublicId: 'receipt-1',
      uploadedAt: new Date(),
    });

    expect(stockReservations.markPendingVerification).toHaveBeenCalledWith(
      prisma,
      checkoutId,
      expect.any(Date),
    );
    expect(checkoutPaymentProof.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { checkoutId } }),
    );
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('creates and commits a COD order only during admin approval', async () => {
    const checkout = includedCheckout();
    pendingCheckout.findUnique.mockResolvedValueOnce(checkout);
    orders.findUnique.mockResolvedValue({
      orderId,
      checkoutId,
      customerId,
      employeeId: null,
      branchId: null,
      orderDate: new Date(),
      totalAmount: new Prisma.Decimal(9850),
      productTotal: new Prisma.Decimal(9500),
      deliveryFee: new Prisma.Decimal(350),
      paymentMethod: 'Cash on Delivery',
      orderStatus: 'Ready to Process',
      orderItems: [],
      customerDetails: null,
      shippingDetails: null,
      checkout: { ...checkout, paymentProof: null },
    });

    await service.reviewPendingCheckout(checkoutId, { status: 'Approved' }, profileId);

    expect(orders.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ checkoutId, customerId, orderStatus: 'Ready to Process' }),
    });
    expect(stockReservations.commitPendingCheckout).toHaveBeenCalledWith(
      prisma,
      checkoutId,
      [expect.objectContaining({ orderItemId, variantId })],
    );
    expect(pendingCheckout.update).toHaveBeenCalledWith({
      where: { checkoutId },
      data: expect.objectContaining({
        status: 'Approved',
        reviewedByProfileId: profileId,
      }),
    });
  });

  it('rejects a checkout without creating an order or changing inventory', async () => {
    pendingCheckout.findUnique.mockResolvedValueOnce(includedCheckout());
    await service.reviewPendingCheckout(
      checkoutId,
      { status: 'Rejected', adminNotes: 'Not approved' },
      profileId,
    );
    expect(stockReservations.releasePendingCheckout).toHaveBeenCalledWith(prisma, checkoutId);
    expect(orders.create).not.toHaveBeenCalled();
    expect(stockReservations.commitPendingCheckout).not.toHaveBeenCalled();
  });

  it('refuses to record a non-Admin profile as the checkout reviewer', async () => {
    profiles.findUnique.mockResolvedValue({ role: { roleName: 'Customer' } });

    await expect(
      service.reviewPendingCheckout(
        checkoutId,
        { status: 'Approved' },
        profileId,
      ),
    ).rejects.toThrow('Only an Admin profile can review a pending checkout.');

    expect(orders.create).not.toHaveBeenCalled();
  });
});
