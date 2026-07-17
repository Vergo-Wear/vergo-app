import { BadRequestException } from '@nestjs/common';
import { StockReservationService } from './stock-reservation.service';

describe('StockReservationService', () => {
  const inventory = { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const stockReservation = {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
  };
  const inventoryCommitment = {
    upsert: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  };
  const prisma = { inventory, stockReservation, inventoryCommitment, $queryRaw: jest.fn() };
  const orderId = '4be0cbd5-2f43-45ff-9f2c-1f0ce8ab4444';
  const orderItemId = '7c1de9f2-30aa-45cd-8f27-b5c07b8f5555';

  let service: StockReservationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StockReservationService();
    inventory.updateMany.mockResolvedValue({ count: 1 });
    stockReservation.create.mockResolvedValue({});
    stockReservation.updateMany.mockResolvedValue({ count: 1 });
    stockReservation.aggregate.mockResolvedValue({ _sum: { quantity: 3 } });
    prisma.$queryRaw.mockResolvedValue([
      { inventoryId: 'inventory-1', quantity: 5 },
    ]);
  });

  it('atomically reserves available inventory and records its owning order item', async () => {
    const expiresAt = new Date('2026-07-17T12:15:00.000Z');

    await service.reserveForOrder(
      prisma as never,
      orderId,
      [{ orderItemId, variantId: 'variant-1', quantity: 2 }],
      expiresAt,
    );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(stockReservation.aggregate).toHaveBeenCalledWith({
      where: { inventoryId: 'inventory-1', status: 'Active' },
      _sum: { quantity: true },
    });
    expect(stockReservation.create).toHaveBeenCalledWith({
      data: {
        orderId,
        orderItemId,
        inventoryId: 'inventory-1',
        quantity: 2,
        expiresAt,
      },
    });
  });

  it('rejects the whole reservation when an order line is unavailable', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { inventoryId: 'inventory-1', quantity: 2 },
    ]);
    stockReservation.aggregate.mockResolvedValue({ _sum: { quantity: 1 } });

    await expect(
      service.reserveForOrder(
        prisma as never,
        orderId,
        [{ orderItemId, variantId: 'variant-1', quantity: 2 }],
        null,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(stockReservation.create).toHaveBeenCalledTimes(1);
  });

  it('releases only active reservations and remains idempotent', async () => {
    stockReservation.findMany.mockResolvedValue([
      { reservationId: 'reservation-1', inventoryId: 'inventory-1', quantity: 2 },
    ]);

    await service.releaseForOrder(
      prisma as never,
      orderId,
      'Expired',
      'Payment receipt was not uploaded',
    );

    expect(stockReservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reservationId: 'reservation-1', status: 'Active' },
        data: expect.objectContaining({ status: 'Expired' }),
      }),
    );
    expect(inventory.updateMany).not.toHaveBeenCalled();
    expect(stockReservation.deleteMany).toHaveBeenCalledWith({
      where: { orderId, status: 'Expired' },
    });
  });

  it('deletes released reservations after a customer cancellation', async () => {
    stockReservation.findMany.mockResolvedValue([
      { reservationId: 'reservation-1', inventoryId: 'inventory-1', quantity: 2 },
    ]);

    await service.releaseForOrder(
      prisma as never,
      orderId,
      'Released',
      'Customer cancelled order',
    );

    expect(stockReservation.deleteMany).toHaveBeenCalledWith({
      where: { orderId, status: 'Released' },
    });
    expect(inventory.updateMany).not.toHaveBeenCalled();
  });

  it('converts only active reservations into sold stock', async () => {
    stockReservation.findMany.mockResolvedValue([
      { reservationId: 'reservation-1', inventoryId: 'inventory-1', quantity: 2 },
    ]);

    await service.confirmForOrder(prisma as never, orderId);

    expect(inventory.updateMany).toHaveBeenCalledWith({
      where: {
        inventoryId: 'inventory-1',
        quantity: { gte: 2 },
      },
      data: {
        quantity: { decrement: 2 },
        lastUpdated: expect.any(Date),
      },
    });
    expect(stockReservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reservationId: 'reservation-1', status: 'Active' },
        data: expect.objectContaining({ status: 'Confirmed' }),
      }),
    );
  });

  it('commits submitted-proof stock, records the allocation, and deletes the reservation', async () => {
    stockReservation.findMany.mockResolvedValue([
      { reservationId: 'reservation-1', inventoryId: 'inventory-1', quantity: 2 },
    ]);
    inventoryCommitment.upsert.mockResolvedValue({});

    await service.commitAndDeleteForOrder(prisma as never, orderId);

    expect(inventory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inventoryId: 'inventory-1', quantity: { gte: 2 } },
        data: expect.objectContaining({ quantity: { decrement: 2 } }),
      }),
    );
    expect(inventoryCommitment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ orderId, inventoryId: 'inventory-1', quantity: 2 }),
      }),
    );
    expect(stockReservation.deleteMany).toHaveBeenCalledWith({
      where: { orderId, status: 'Active' },
    });
  });

  it('restores committed stock once when an admin rejects the proof', async () => {
    inventoryCommitment.findMany.mockResolvedValue([
      { commitmentId: 'commitment-1', inventoryId: 'inventory-1', quantity: 2 },
    ]);
    inventoryCommitment.updateMany.mockResolvedValue({ count: 1 });
    inventory.update.mockResolvedValue({});

    await service.restoreCommittedForOrder(prisma as never, orderId);

    expect(inventory.update).toHaveBeenCalledWith({
      where: { inventoryId: 'inventory-1' },
      data: expect.objectContaining({ quantity: { increment: 2 } }),
    });
  });
});
