import { BadRequestException } from '@nestjs/common';
import { StockReservationService } from './stock-reservation.service';

describe('StockReservationService checkout-owned lifecycle', () => {
  const checkoutId = '6b133395-0982-4201-8c62-3edc62b66666';
  const orderId = '4be0cbd5-2f43-45ff-9f2c-1f0ce8ab4444';
  const reservationId = '7c1de9f2-30aa-45cd-8f27-b5c07b8f5555';
  const inventoryId = '0f05e3e7-6621-4f8c-9266-1b9b691c6666';
  const variantId = 'e335e75a-f87d-4937-a765-712f3ad93333';
  const orderItemId = '8ce20d49-4e37-4ab0-b80f-bc262b597777';

  const stockReservation = {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    updateMany: jest.fn(),
  };
  const inventory = { update: jest.fn(), updateMany: jest.fn() };
  const inventoryCommitment = { create: jest.fn(), updateMany: jest.fn() };
  const prisma = {
    stockReservation,
    inventory,
    inventoryCommitment,
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
  let service: StockReservationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StockReservationService();
    stockReservation.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { reservationId, checkoutId, inventoryId, quantity: 2, status: 'Active' },
    ]);
    stockReservation.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
    stockReservation.create.mockResolvedValue({ reservationId });
    stockReservation.deleteMany.mockResolvedValue({ count: 1 });
    stockReservation.updateMany.mockResolvedValue({ count: 1 });
    inventory.update.mockResolvedValue({});
    inventory.updateMany.mockResolvedValue({ count: 1 });
    inventoryCommitment.create.mockResolvedValue({});
    inventoryCommitment.updateMany.mockResolvedValue({ count: 1 });
    prisma.$queryRaw.mockResolvedValue([{ inventoryId, variantId, quantity: 5 }]);
  });

  it('creates Active reservations owned only by checkout and inventory', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await service.reserveForCheckout(
      prisma as never,
      checkoutId,
      [{ variantId, quantity: 2 }],
      expiresAt,
    );
    expect(stockReservation.create).toHaveBeenCalledWith({
      data: {
        checkoutId,
        inventoryId,
        quantity: 2,
        status: 'Active',
        expiresAt,
      },
    });
  });

  it('creates a non-expiring Active hold for COD checkout approval', async () => {
    await service.reserveForCheckout(
      prisma as never,
      checkoutId,
      [{ variantId, quantity: 2 }],
      null,
    );
    expect(stockReservation.create).toHaveBeenCalledWith({
      data: {
        checkoutId,
        inventoryId,
        quantity: 2,
        status: 'Active',
        expiresAt: null,
      },
    });
  });

  it('returns an existing checkout hold without renewing the DB expiry', async () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    stockReservation.findMany.mockReset().mockResolvedValue([
      { reservationId, checkoutId, inventoryId, expiresAt, status: 'Active' },
    ]);
    const result = await service.reserveForCheckout(
      prisma as never,
      checkoutId,
      [{ variantId, quantity: 3 }],
      new Date(Date.now() + 15 * 60 * 1000),
    );
    expect(result[0].expiresAt).toEqual(expiresAt);
    expect(stockReservation.deleteMany).not.toHaveBeenCalled();
    expect(stockReservation.create).not.toHaveBeenCalled();
  });

  it('counts all active and pending-verification holds when allocating', async () => {
    stockReservation.aggregate.mockResolvedValue({ _sum: { quantity: 5 } });
    await expect(
      service.reserveForCheckout(
        prisma as never,
        checkoutId,
        [{ variantId, quantity: 1 }],
        new Date(Date.now() + 15 * 60 * 1000),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(stockReservation.aggregate).toHaveBeenCalledWith({
      where: {
        inventoryId,
        status: { in: ['Active', 'Pending Verification'] },
      },
      _sum: { quantity: true },
    });
  });

  it('moves every checkout hold to Pending Verification atomically', async () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    prisma.$queryRaw.mockResolvedValue([{ reservationId, expiresAt }]);
    const uploadedAt = new Date();
    await service.markPendingVerification(prisma as never, checkoutId, uploadedAt);
    expect(stockReservation.updateMany).toHaveBeenCalledWith({
      where: { checkoutId, status: 'Active', expiresAt: { gt: uploadedAt } },
      data: { status: 'Pending Verification' },
    });
  });

  it('commits a checkout hold then deletes all reservations for the checkout', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ reservationId, inventoryId, quantity: 2, variantId }])
      .mockResolvedValueOnce([]);
    await service.commitPendingCheckout(prisma as never, checkoutId, [
      { orderItemId, variantId, quantity: 2 },
    ]);
    expect(inventoryCommitment.create).toHaveBeenCalledWith({
      data: { orderItemId, inventoryId, quantity: 2, status: 'Committed' },
    });
    expect(stockReservation.deleteMany).toHaveBeenCalledWith({ where: { checkoutId } });
  });

  it('refuses to commit a partial checkout hold', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { reservationId, inventoryId, quantity: 1, variantId },
    ]);

    await expect(
      service.commitPendingCheckout(prisma as never, checkoutId, [
        { orderItemId, variantId, quantity: 2 },
      ]),
    ).rejects.toThrow('The reserved stock no longer matches the checkout items.');

    expect(inventory.updateMany).not.toHaveBeenCalled();
    expect(inventoryCommitment.create).not.toHaveBeenCalled();
  });

  it('restores committed inventory once by joining commitment to order_item', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { commitmentId: 'commitment-1', inventoryId, quantity: 2 },
    ]);
    await service.restoreCommittedForOrder(
      prisma as never,
      orderId,
      'Customer cancelled order',
    );
    expect(inventoryCommitment.updateMany).toHaveBeenCalledWith({
      where: { commitmentId: 'commitment-1', status: 'Committed' },
      data: {
        status: 'Restored',
        restoredAt: expect.any(Date),
        restoreReason: 'Customer cancelled order',
      },
    });
    expect(inventory.update).toHaveBeenCalledWith({
      where: { inventoryId },
      data: { quantity: { increment: 2 }, lastUpdated: expect.any(Date) },
    });
  });
});
