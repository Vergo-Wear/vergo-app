import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  private async customerIdForProfile(profileId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
      select: { customerId: true },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    return customer.customerId;
  }

  /**
   * Lists the customer's saved addresses, primary address first.
   */
  async findCustomerAddresses(profileId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    return this.prisma.userAddress.findMany({
      where: { customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Saves a new address for the customer. When isPrimary is requested,
   * all existing addresses are demoted first inside the same transaction
   * so exactly one primary address ever exists.
   */
  async createCustomerAddress(profileId: string, dto: CreateUserAddressDto) {
    const customerId = await this.customerIdForProfile(profileId);
    return this.prisma.$transaction((tx) =>
      AddressesService.saveAddress(tx, customerId, dto),
    );
  }

  /**
   * Marks an existing saved address as the customer's primary address,
   * demoting every other address inside one transaction.
   */
  async setPrimaryAddress(profileId: string, addressId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.userAddress.findFirst({
        where: { addressId, customerId },
      });
      if (!address) throw new NotFoundException('Saved address not found.');
      await tx.userAddress.updateMany({
        where: { customerId, isPrimary: true },
        data: { isPrimary: false, updatedAt: new Date() },
      });
      return tx.userAddress.update({
        where: { addressId },
        data: { isPrimary: true, updatedAt: new Date() },
      });
    });
  }

  async deleteCustomerAddress(profileId: string, addressId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const address = await this.prisma.userAddress.findFirst({
      where: { addressId, customerId },
    });
    if (!address) throw new NotFoundException('Saved address not found.');
    return this.prisma.userAddress.delete({ where: { addressId } });
  }

  /**
   * Inserts an address for a customer within an existing transaction.
   * Shared with the checkout flow so "save this new address" during
   * checkout participates in the order transaction.
   */
  static async saveAddress(
    tx: Prisma.TransactionClient,
    customerId: string,
    dto: CreateUserAddressDto,
  ) {
    if (dto.isPrimary) {
      await tx.userAddress.updateMany({
        where: { customerId, isPrimary: true },
        data: { isPrimary: false, updatedAt: new Date() },
      });
    }
    return tx.userAddress.create({
      data: {
        customerId,
        receiverName: dto.receiverName,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 || null,
        city: dto.city,
        district: dto.district,
        postalCode: dto.postalCode || null,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }
}
