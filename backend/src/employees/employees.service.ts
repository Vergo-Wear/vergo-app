import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new employee record linked to an existing profile.
   * Validates profile existence and prevents duplicate employee for the same profile.
   */
  async create(dto: CreateEmployeeDto) {
    // Validate profile exists
    const profile = await this.prisma.profiles.findUnique({
      where: { id: dto.profileId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Profile with ID "${dto.profileId}" not found.`,
      );
    }

    // Check for duplicate employee for the same profile
    const existingEmployee = await this.prisma.employee.findFirst({
      where: { profileId: dto.profileId },
    });

    if (existingEmployee) {
      throw new ConflictException(
        `An employee record already exists for profile ID "${dto.profileId}".`,
      );
    }

    const employee = await this.prisma.employee.create({
      data: {
        profileId: dto.profileId,
        branchId: dto.branchId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        address: dto.address,
        position: dto.position,
        salary:
          dto.salary !== undefined ? new Prisma.Decimal(dto.salary) : undefined,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
    });

    this.logger.log(
      `Employee created with ID "${employee.employeeId}" for profile "${dto.profileId}"`,
    );
    return employee;
  }

  /**
   * Finds an employee by their profile ID.
   */
  async findByProfileId(profileId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { profileId },
    });

    if (!employee) {
      throw new NotFoundException(
        `No employee found for profile ID "${profileId}".`,
      );
    }

    return employee;
  }

  async updateAvailability(profileId: string, status: string) {
    const employee = await this.findByProfileId(profileId);
    return this.prisma.employee.update({
      where: { employeeId: employee.employeeId },
      data: { availabilityStatus: status },
    });
  }

  /**
   * Updates an existing employee record.
   */
  async update(id: string, dto: UpdateEmployeeDto) {
    // Verify employee exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { employeeId: id },
    });

    if (!existingEmployee) {
      throw new NotFoundException(`Employee with ID "${id}" not found.`);
    }

    const employee = await this.prisma.employee.update({
      where: { employeeId: id },
      data: {
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.salary !== undefined && {
          salary: new Prisma.Decimal(dto.salary),
        }),
        ...(dto.hireDate !== undefined && {
          hireDate: new Date(dto.hireDate),
        }),
      },
    });

    this.logger.log(`Employee "${id}" updated`);
    return employee;
  }
}
