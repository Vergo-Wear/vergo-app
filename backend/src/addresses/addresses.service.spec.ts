import { NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';

describe('AddressesService', () => {
  const customerDelegate = { findFirst: jest.fn() };
  const userAddressDelegate = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  };

  const prisma = {
    customer: customerDelegate,
    userAddress: userAddressDelegate,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(prisma),
    ),
  };

  let service: AddressesService;

  const profileId = '0b9adb71-9b7a-4a2f-9c3f-6a1d9dbb1111';
  const customerId = '9f3a2c83-1a28-4e4d-82b7-805c91642222';
  const addressId = '7c1de9f2-30aa-45cd-8f27-b5c07b8f5555';

  const dto: CreateUserAddressDto = {
    receiverName: 'Julian Verso',
    phone: '0771234567',
    addressLine1: '12 Galle Road',
    city: 'Colombo',
    district: 'Colombo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AddressesService(prisma as never);
    customerDelegate.findFirst.mockResolvedValue({ customerId });
    userAddressDelegate.updateMany.mockResolvedValue({ count: 1 });
  });

  it('throws when no customer exists for the profile', async () => {
    customerDelegate.findFirst.mockResolvedValue(null);

    await expect(service.findCustomerAddresses(profileId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists the customer addresses with the primary first', async () => {
    userAddressDelegate.findMany.mockResolvedValue([]);

    await service.findCustomerAddresses(profileId);

    expect(userAddressDelegate.findMany).toHaveBeenCalledWith({
      where: { customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('creates a non-primary address without demoting others', async () => {
    userAddressDelegate.create.mockResolvedValue({ addressId });

    await service.createCustomerAddress(profileId, dto);

    expect(userAddressDelegate.updateMany).not.toHaveBeenCalled();
    expect(userAddressDelegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId,
        receiverName: 'Julian Verso',
        isPrimary: false,
      }),
    });
  });

  it('demotes existing primaries inside the transaction when creating a primary address', async () => {
    userAddressDelegate.create.mockResolvedValue({ addressId });

    await service.createCustomerAddress(profileId, {
      ...dto,
      isPrimary: true,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(userAddressDelegate.updateMany).toHaveBeenCalledWith({
      where: { customerId, isPrimary: true },
      data: expect.objectContaining({ isPrimary: false }),
    });
    expect(userAddressDelegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isPrimary: true }),
    });
  });

  it('sets an existing address as primary and demotes the rest', async () => {
    userAddressDelegate.findFirst.mockResolvedValue({ addressId, customerId });
    userAddressDelegate.update.mockResolvedValue({
      addressId,
      isPrimary: true,
    });

    const result = await service.setPrimaryAddress(profileId, addressId);

    expect(userAddressDelegate.updateMany).toHaveBeenCalledWith({
      where: { customerId, isPrimary: true },
      data: expect.objectContaining({ isPrimary: false }),
    });
    expect(userAddressDelegate.update).toHaveBeenCalledWith({
      where: { addressId },
      data: expect.objectContaining({ isPrimary: true }),
    });
    expect(result).toMatchObject({ isPrimary: true });
  });

  it("refuses to set another customer's address as primary", async () => {
    userAddressDelegate.findFirst.mockResolvedValue(null);

    await expect(
      service.setPrimaryAddress(profileId, addressId),
    ).rejects.toThrow(NotFoundException);
    expect(userAddressDelegate.update).not.toHaveBeenCalled();
  });

  it("refuses to delete another customer's address", async () => {
    userAddressDelegate.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteCustomerAddress(profileId, addressId),
    ).rejects.toThrow(NotFoundException);
    expect(userAddressDelegate.delete).not.toHaveBeenCalled();
  });

  it('deletes an owned address', async () => {
    userAddressDelegate.findFirst.mockResolvedValue({ addressId, customerId });
    userAddressDelegate.delete.mockResolvedValue({ addressId });

    await service.deleteCustomerAddress(profileId, addressId);

    expect(userAddressDelegate.delete).toHaveBeenCalledWith({
      where: { addressId },
    });
  });
});
