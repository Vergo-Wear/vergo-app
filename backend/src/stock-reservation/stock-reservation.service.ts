import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type ReservableOrderItem = {
  orderItemId: string;
  variantId: string | null;
  quantity: number;
  variant?: { sku?: string | null } | null;
};

@Injectable()
export class StockReservationService {
  /**
   * Reserves the exact inventory allocations owned by an order. Each
   * conditional inventory update and its matching record run in the caller's
   * transaction, so an unavailable line rolls back the whole checkout.
   */
  async reserveForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    orderItems: ReservableOrderItem[],
    expiresAt: Date | null,
  ) {
    const sortedItems = [...orderItems].sort((left, right) =>
      (left.variantId ?? '').localeCompare(right.variantId ?? ''),
    );
    for (const item of sortedItems) {
      if (!item.variantId || item.quantity <= 0) {
        throw new BadRequestException(
          'Every order item must have a valid variant and quantity.',
        );
      }

      let remaining = item.quantity;
      // Lock the candidate inventory rows before totaling active reservations.
      // Every checkout uses this order, so two concurrent checkouts cannot
      // both consume the final unit after reserved_quantity was removed.
      const inventoryRows = await tx.$queryRaw<
        { inventoryId: string; quantity: number }[]
      >(Prisma.sql`
        SELECT "inventory_id" AS "inventoryId", "quantity"
        FROM "public"."inventory"
        WHERE "variant_id" = ${item.variantId}::uuid
        ORDER BY "inventory_id"
        FOR UPDATE
      `);

      for (const row of inventoryRows) {
        if (remaining === 0) break;
        const activeReservations = await tx.stockReservation.aggregate({
          where: { inventoryId: row.inventoryId, status: 'Active' },
          _sum: { quantity: true },
        });
        const reservedQuantity = activeReservations._sum.quantity ?? 0;
        const available = row.quantity - reservedQuantity;
        const quantity = Math.min(remaining, Math.max(0, available));
        if (quantity === 0) continue;

        await tx.stockReservation.create({
          data: {
            orderId,
            orderItemId: item.orderItemId,
            inventoryId: row.inventoryId,
            quantity,
            expiresAt,
          },
        });
        remaining -= quantity;
      }

      if (remaining > 0) {
        throw new BadRequestException(
          'Some products in your order are no longer available. Please review your cart and try again.',
        );
      }
    }
  }

  /** Releases active allocations once and removes the transient hold records. */
  async releaseForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    status: 'Released' | 'Expired',
    releaseReason: string,
  ) {
    const reservations = await tx.stockReservation.findMany({
      where: { orderId, status: 'Active' },
    });

    for (const reservation of reservations) {
      const transitioned = await tx.stockReservation.updateMany({
        where: { reservationId: reservation.reservationId, status: 'Active' },
        data: {
          status,
          releasedAt: new Date(),
          releaseReason,
        },
      });
      if (transitioned.count === 0) continue;
    }

    // A released or expired hold has no remaining stock responsibility. The
    // order and payment proof retain the customer history, so purge only the
    // transient allocation rows.
    await tx.stockReservation.deleteMany({
      where: { orderId, status },
    });
  }

  /** Converts active allocations into committed inventory exactly once. */
  async confirmForOrder(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.stockReservation.findMany({
      where: { orderId, status: 'Active' },
    });

    for (const reservation of reservations) {
      const committed = await tx.inventory.updateMany({
        where: {
          inventoryId: reservation.inventoryId,
          quantity: { gte: reservation.quantity },
        },
        data: {
          quantity: { decrement: reservation.quantity },
          lastUpdated: new Date(),
        },
      });
      if (committed.count !== 1) {
        throw new ConflictException('The reserved stock is no longer available.');
      }

      const transitioned = await tx.stockReservation.updateMany({
        where: { reservationId: reservation.reservationId, status: 'Active' },
        data: { status: 'Confirmed', confirmedAt: new Date() },
      });
      if (transitioned.count !== 1) {
        throw new ConflictException('The stock reservation changed. Please retry.');
      }
    }
  }

  /** Commits held stock and removes the now-complete allocation records. */
  async confirmAndDeleteForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    await this.confirmForOrder(tx, orderId);
    await tx.stockReservation.deleteMany({
      where: { orderId, status: 'Confirmed' },
    });
  }

  /**
   * Commits an uploaded bank-transfer receipt's held stock, records the exact
   * inventory rows changed, then removes the temporary reservation records.
   * The commitment record lets a later admin rejection restore the same rows.
   */
  async commitAndDeleteForOrder(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.stockReservation.findMany({
      where: { orderId, status: 'Active' },
    });

    for (const reservation of reservations) {
      const committed = await tx.inventory.updateMany({
        where: {
          inventoryId: reservation.inventoryId,
          quantity: { gte: reservation.quantity },
        },
        data: {
          quantity: { decrement: reservation.quantity },
          lastUpdated: new Date(),
        },
      });
      if (committed.count !== 1) {
        throw new ConflictException('The reserved stock is no longer available.');
      }

      await tx.inventoryCommitment.upsert({
        where: {
          orderId_inventoryId: { orderId, inventoryId: reservation.inventoryId },
        },
        create: {
          orderId,
          inventoryId: reservation.inventoryId,
          quantity: reservation.quantity,
        },
        update: {
          quantity: { increment: reservation.quantity },
          status: 'Committed',
          committedAt: new Date(),
          restoredAt: null,
        },
      });
    }

    await tx.stockReservation.deleteMany({
      where: { orderId, status: 'Active' },
    });
  }

  /** Restores stock committed at receipt submission once, after rejection. */
  async restoreCommittedForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const commitments = await tx.inventoryCommitment.findMany({
      where: { orderId, status: 'Committed' },
    });

    for (const commitment of commitments) {
      const restored = await tx.inventoryCommitment.updateMany({
        where: {
          commitmentId: commitment.commitmentId,
          status: 'Committed',
        },
        data: { status: 'Restored', restoredAt: new Date() },
      });
      if (restored.count !== 1) continue;

      await tx.inventory.update({
        where: { inventoryId: commitment.inventoryId },
        data: {
          quantity: { increment: commitment.quantity },
          lastUpdated: new Date(),
        },
      });
    }
  }
}
