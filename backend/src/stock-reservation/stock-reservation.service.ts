import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

type RequestedItem = { variantId: string; quantity: number };
type PersistedOrderItem = RequestedItem & { orderItemId: string };
type LockedInventory = {
  inventoryId: string;
  variantId: string;
  quantity: number;
};

const HOLDING_STATUSES = ['Active', 'Pending Verification'];

@Injectable()
export class StockReservationService {
  lockCustomerCheckout(tx: Prisma.TransactionClient, customerId: string) {
    return tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${customerId}))`,
    );
  }

  private aggregateItems(items: RequestedItem[]) {
    const totals = new Map<string, number>();
    for (const item of items) {
      if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException(
          'Every order item must have a valid variant and quantity.',
        );
      }
      totals.set(item.variantId, (totals.get(item.variantId) ?? 0) + item.quantity);
    }
    return [...totals.entries()]
      .map(([variantId, quantity]) => ({ variantId, quantity }))
      .sort((left, right) => left.variantId.localeCompare(right.variantId));
  }

  private lockInventoryForVariant(
    tx: Prisma.TransactionClient,
    variantId: string,
  ) {
    return tx.$queryRaw<LockedInventory[]>(Prisma.sql`
      SELECT "inventory_id" AS "inventoryId", "variant_id" AS "variantId", "quantity"
      FROM "public"."inventory"
      WHERE "variant_id" = ${variantId}::uuid
      ORDER BY "inventory_id"
      FOR UPDATE
    `);
  }

  private async heldQuantity(
    tx: Prisma.TransactionClient,
    inventoryId: string,
  ) {
    const held = await tx.stockReservation.aggregate({
      where: { inventoryId, status: { in: HOLDING_STATUSES } },
      _sum: { quantity: true },
    });
    return held._sum.quantity ?? 0;
  }

  /** Creates or replaces every inventory allocation owned by one checkout. */
  async reserveForCheckout(
    tx: Prisma.TransactionClient,
    checkoutId: string,
    items: RequestedItem[],
    expiresAt: Date | null,
    replaceExisting = false,
  ) {
    const requested = this.aggregateItems(items);
    const existing = await tx.stockReservation.findMany({
      where: { checkoutId, status: 'Active' },
      orderBy: { reservationId: 'asc' },
    });
    if (existing.length > 0 && !replaceExisting) return existing;
    if (existing.length > 0) {
      await tx.stockReservation.deleteMany({ where: { checkoutId, status: 'Active' } });
    }

    for (const item of requested) {
      let remaining = item.quantity;
      const inventoryRows = await this.lockInventoryForVariant(tx, item.variantId);
      for (const row of inventoryRows) {
        if (remaining === 0) break;
        const held = await this.heldQuantity(tx, row.inventoryId);
        const allocated = Math.min(remaining, Math.max(0, row.quantity - held));
        if (allocated === 0) continue;
        await tx.stockReservation.create({
          data: {
            checkoutId,
            inventoryId: row.inventoryId,
            quantity: allocated,
            status: 'Active',
            expiresAt,
          },
        });
        remaining -= allocated;
      }
      if (remaining > 0) {
        throw new BadRequestException(
          'Some products in your order are no longer available. Please review your cart and try again.',
        );
      }
    }
    return tx.stockReservation.findMany({
      where: { checkoutId, status: 'Active' },
      orderBy: { reservationId: 'asc' },
    });
  }

  async markPendingVerification(
    tx: Prisma.TransactionClient,
    checkoutId: string,
    uploadedAt: Date,
  ) {
    const reservations = await tx.$queryRaw<{
      reservationId: string;
      expiresAt: Date | null;
    }[]>(
      Prisma.sql`
        SELECT "reservation_id" AS "reservationId", "expires_at" AS "expiresAt"
        FROM "public"."stock_reservation"
        WHERE "checkout_id" = ${checkoutId}::uuid AND "status" = 'Active'
        ORDER BY "reservation_id"
        FOR UPDATE
      `,
    );
    if (reservations.length === 0) {
      throw new NotFoundException('Active stock reservation not found.');
    }
    if (
      reservations.some(
        (reservation) =>
          !reservation.expiresAt || reservation.expiresAt <= uploadedAt,
      )
    ) {
      throw new BadRequestException('The payment window has expired.');
    }
    const transition = await tx.stockReservation.updateMany({
      where: { checkoutId, status: 'Active', expiresAt: { gt: uploadedAt } },
      data: { status: 'Pending Verification' },
    });
    if (transition.count !== reservations.length) {
      throw new ConflictException('The stock reservation changed. Please retry.');
    }
    return reservations[0].expiresAt!;
  }

  /** Converts a COD or Bank Transfer checkout hold into commitments. */
  async commitPendingCheckout(
    tx: Prisma.TransactionClient,
    checkoutId: string,
    orderItems: PersistedOrderItem[],
  ) {
    const reservations = await tx.$queryRaw<{
      reservationId: string;
      inventoryId: string;
      quantity: number;
      variantId: string;
    }[]>(Prisma.sql`
      SELECT reservation."reservation_id" AS "reservationId",
             reservation."inventory_id" AS "inventoryId",
             reservation."quantity", inventory."variant_id" AS "variantId"
      FROM "public"."stock_reservation" AS reservation
      JOIN "public"."inventory" AS inventory
        ON inventory."inventory_id" = reservation."inventory_id"
      WHERE reservation."checkout_id" = ${checkoutId}::uuid
        AND reservation."status" IN ('Active', 'Pending Verification')
      ORDER BY reservation."inventory_id", reservation."reservation_id"
      FOR UPDATE OF reservation
    `);
    if (reservations.length === 0) {
      throw new ConflictException('No stock reservation exists for this checkout.');
    }
    const itemByVariant = new Map(
      orderItems.map((item) => [item.variantId, item.orderItemId]),
    );
    const requestedByVariant = new Map(
      orderItems.map((item) => [item.variantId, item.quantity]),
    );
    const reservedByVariant = new Map<string, number>();
    for (const reservation of reservations) {
      reservedByVariant.set(
        reservation.variantId,
        (reservedByVariant.get(reservation.variantId) ?? 0) + reservation.quantity,
      );
    }
    if (
      requestedByVariant.size !== reservedByVariant.size ||
      [...requestedByVariant].some(
        ([variantId, quantity]) => reservedByVariant.get(variantId) !== quantity,
      )
    ) {
      throw new ConflictException(
        'The reserved stock no longer matches the checkout items.',
      );
    }
    for (const reservation of reservations) {
      const orderItemId = itemByVariant.get(reservation.variantId);
      if (!orderItemId) {
        throw new ConflictException('The reserved stock no longer matches the checkout items.');
      }
      await tx.$queryRaw(Prisma.sql`
        SELECT "inventory_id" FROM "public"."inventory"
        WHERE "inventory_id" = ${reservation.inventoryId}::uuid FOR UPDATE
      `);
      const deducted = await tx.inventory.updateMany({
        where: {
          inventoryId: reservation.inventoryId,
          quantity: { gte: reservation.quantity },
        },
        data: {
          quantity: { decrement: reservation.quantity },
          lastUpdated: new Date(),
        },
      });
      if (deducted.count !== 1) {
        throw new ConflictException('The reserved stock is no longer available.');
      }
      await tx.inventoryCommitment.create({
        data: {
          orderItemId,
          inventoryId: reservation.inventoryId,
          quantity: reservation.quantity,
          status: 'Committed',
        },
      });
    }
    await tx.stockReservation.deleteMany({ where: { checkoutId } });
  }

  releasePendingCheckout(tx: Prisma.TransactionClient, checkoutId: string) {
    return tx.stockReservation.deleteMany({
      where: { checkoutId, status: { in: HOLDING_STATUSES } },
    });
  }

  expireActive(tx: Prisma.TransactionClient, now: Date) {
    return tx.stockReservation.deleteMany({
      where: { status: 'Active', expiresAt: { lte: now } },
    });
  }

  /** Restores a physical deduction once, finding the order through order_item. */
  async restoreCommittedForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    restoreReason: string,
  ) {
    const commitments = await tx.$queryRaw<{
      commitmentId: string;
      inventoryId: string;
      quantity: number;
    }[]>(Prisma.sql`
      SELECT commitment."commitment_id" AS "commitmentId",
             commitment."inventory_id" AS "inventoryId", commitment."quantity"
      FROM "public"."inventory_commitment" AS commitment
      JOIN "public"."order_item" AS item
        ON item."order_item_id" = commitment."order_item_id"
      WHERE item."order_id" = ${orderId}::uuid AND commitment."status" = 'Committed'
      ORDER BY commitment."inventory_id", commitment."commitment_id"
      FOR UPDATE OF commitment
    `);
    for (const commitment of commitments) {
      const transitioned = await tx.inventoryCommitment.updateMany({
        where: { commitmentId: commitment.commitmentId, status: 'Committed' },
        data: { status: 'Restored', restoredAt: new Date(), restoreReason },
      });
      if (transitioned.count !== 1) continue;
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
