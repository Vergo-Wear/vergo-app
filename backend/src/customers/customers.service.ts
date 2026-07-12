import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new customer record linked to an existing profile.
   * Validates profile existence, duplicate customer, and email uniqueness.
   */
  async create(dto: CreateCustomerDto) {
    // Validate profile exists
    const profile = await this.prisma.profiles.findUnique({
      where: { id: dto.profileId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Profile with ID "${dto.profileId}" not found.`,
      );
    }

    // Check for duplicate customer for the same profile
    const existingCustomer = await this.prisma.customer.findFirst({
      where: { profileId: dto.profileId },
    });

    if (existingCustomer) {
      throw new ConflictException(
        `A customer record already exists for profile ID "${dto.profileId}".`,
      );
    }

    // Check email uniqueness
    const existingEmail = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException(
        `A customer with email "${dto.email}" already exists.`,
      );
    }

    const customer = await this.prisma.customer.create({
      data: {
        profileId: dto.profileId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        defaultShippingAddress: dto.defaultShippingAddress,
      },
    });

    this.logger.log(
      `Customer created with ID "${customer.customerId}" for profile "${dto.profileId}"`,
    );
    return customer;
  }

  /**
   * Finds a customer by their profile ID.
   */
  async findByProfileId(profileId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
    });

    if (!customer) {
      throw new NotFoundException(
        `No customer found for profile ID "${profileId}".`,
      );
    }

    return customer;
  }

  async updateByProfileId(profileId: string, dto: UpdateCustomerDto) {
    const customer = await this.findByProfileId(profileId);
    return this.update(customer.customerId, dto);
  }

  /**
   * Updates an existing customer record.
   * Validates email uniqueness if email is being changed.
   */
  async update(id: string, dto: UpdateCustomerDto) {
    // Verify customer exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { customerId: id },
    });

    if (!existingCustomer) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }

    // Check email uniqueness if being updated
    if (dto.email) {
      const existingEmail = await this.prisma.customer.findUnique({
        where: { email: dto.email },
      });

      if (existingEmail && existingEmail.customerId !== id) {
        throw new ConflictException(
          `A customer with email "${dto.email}" already exists.`,
        );
      }
    }

    const updated = await this.prisma.customer.update({
      where: { customerId: id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.defaultShippingAddress !== undefined && {
          defaultShippingAddress: dto.defaultShippingAddress,
        }),
      },
    });

    this.logger.log(`Customer "${id}" updated`);
    return updated;
  }
}
