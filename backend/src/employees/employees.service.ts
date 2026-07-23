import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../auth/supabase.service';
import { ProfileStatus } from '../common/enums/profile-status.enum';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeAccountDto } from './dto/create-employee-account.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Creates a complete employee account from the Admin Dashboard:
   * Supabase Auth user → profiles (Employee role) → employee (linked to branch).
   * Rolls back the Supabase Auth user if the database writes fail, so no
   * partial employee accounts are left behind.
   */
  async createEmployeeAccount(
    dto: CreateEmployeeAccountDto,
    createdByProfileId?: string,
  ) {
    const email = dto.email.trim().toLowerCase();

    // Normalize phone: strip leading 0, prepend +94 (matches AuthService rules)
    const resolvedPhone = dto.phone.trim().startsWith('+94')
      ? dto.phone.trim()
      : '+94' + dto.phone.trim().replace(/^0/, '');

    // 1. Email uniqueness check against existing Supabase Auth users
    const existingAuthUser = await this.prisma.authUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existingAuthUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    // 2. Phone uniqueness check against existing employees
    const existingEmployeeByPhone = await this.prisma.employee.findFirst({
      where: { phone: resolvedPhone },
    });
    if (existingEmployeeByPhone) {
      throw new ConflictException(
        'An employee with this phone number already exists.',
      );
    }

    // 3. Resolve the existing Employee role dynamically (never hardcoded)
    const employeeRole = await this.prisma.role.findFirst({
      where: { roleName: { equals: 'Employee', mode: 'insensitive' } },
    });
    if (!employeeRole) {
      throw new BadRequestException(
        'Employee role is not configured in the database.',
      );
    }

    // 4. Validate the selected branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: dto.branchId },
    });
    if (!branch) {
      throw new BadRequestException('The selected branch does not exist.');
    }

    // 5. Create the Supabase Auth user with a generated password. It is
    //    shown once to the admin in the success response and never stored;
    //    the employee may keep using it or change it via Forgot Password.
    const password = this.generatePassword();
    const { data: authData, error: authError } =
      await this.supabaseService.adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      this.logger.error(
        `Supabase Auth employee creation failed: ${authError?.message}`,
      );
      if (authError?.message?.toLowerCase().includes('already')) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
      throw new BadRequestException(
        'Failed to create the employee authentication account.',
      );
    }

    const userId = authData.user.id;

    // 6. Create profile + employee records atomically
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Upsert handles DB triggers that may auto-create a bare profile row
        const profile = await tx.profiles.upsert({
          where: { id: userId },
          update: {
            roleId: employeeRole.roleId,
            status: ProfileStatus.ACTIVE,
          },
          create: {
            id: userId,
            roleId: employeeRole.roleId,
            status: ProfileStatus.ACTIVE,
          },
        });

        const employee = await tx.employee.create({
          data: {
            profileId: userId,
            branchId: dto.branchId,
            createdByProfileId: createdByProfileId ?? null,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: resolvedPhone,
            address: dto.address?.trim() || null,
            position: dto.position.trim(),
            commissionPerParcel: new Prisma.Decimal(
              dto.commissionPerParcel ?? 0,
            ),
            hireDate: new Date(),
          },
        });

        return { profile, employee };
      });

      this.logger.log(
        `Employee account created: auth user "${userId}", employee "${result.employee.employeeId}", branch "${branch.branchId}"`,
      );

      return {
        message: 'Employee account created successfully.',
        employee: {
          employeeId: result.employee.employeeId,
          profileId: result.employee.profileId,
          branchId: result.employee.branchId,
          branchName: branch.name,
          firstName: result.employee.firstName,
          lastName: result.employee.lastName,
          phone: result.employee.phone,
          position: result.employee.position,
          email,
        },
        // Login credentials for the admin to hand over to the employee.
        // The password is not stored anywhere and cannot be retrieved again.
        credentials: {
          email,
          password,
        },
      };
    } catch (dbError) {
      this.logger.error(
        `Database writes failed for employee auth user ${userId}. Rolling back Supabase user.`,
        dbError,
      );

      // Roll back the Auth user so no orphaned account remains
      try {
        await this.supabaseService.adminClient.auth.admin.deleteUser(userId);
        this.logger.log(`Rolled back orphaned Supabase user "${userId}"`);
      } catch (deleteError) {
        this.logger.error(
          `Failed to roll back Supabase user "${userId}":`,
          deleteError,
        );
      }

      throw dbError;
    }
  }

  /**
   * Removes an employee account completely: the Supabase Auth user, the
   * profile, and the employee record. Deleting the Auth user cascades to
   * profiles and employee via the database foreign keys; explicit cleanup
   * afterwards covers rows the cascade may have missed.
   */
  async removeEmployeeAccount(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId },
    });
    if (!employee) {
      throw new NotFoundException(
        `Employee with ID "${employeeId}" not found.`,
      );
    }

    if (employee.profileId) {
      const { error } =
        await this.supabaseService.adminClient.auth.admin.deleteUser(
          employee.profileId,
        );
      if (error) {
        this.logger.error(
          `Supabase Auth deletion failed for employee "${employeeId}" (profile "${employee.profileId}"): ${error.message}`,
        );
        throw new ConflictException(
          'Could not remove the employee account. They may have linked records such as orders or deliveries.',
        );
      }
    }

    // Cleanup in case the database cascade did not remove these rows
    try {
      if (employee.profileId) {
        await this.prisma.profiles.deleteMany({
          where: { id: employee.profileId },
        });
      }
      await this.prisma.employee.deleteMany({ where: { employeeId } });
    } catch (cleanupError) {
      this.logger.error(
        `Cleanup after auth deletion failed for employee "${employeeId}":`,
        cleanupError,
      );
      throw new ConflictException(
        'The login account was removed, but the employee record could not be deleted because it has linked records.',
      );
    }

    this.logger.log(
      `Employee "${employeeId}" removed (profile "${employee.profileId ?? 'none'}")`,
    );

    return {
      message: 'Employee removed successfully.',
      employeeId,
    };
  }

  /**
   * Lists branches for the employee-creation dropdown.
   */
  async listBranches() {
    return this.prisma.branch.findMany({
      select: { branchId: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Generates a 12-character crypto-random password that is easy to read
   * out and type (no ambiguous characters like 0/O or 1/l).
   */
  private generatePassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(12);
    let password = '';
    for (const byte of bytes) {
      password += alphabet[byte % alphabet.length];
    }
    return password;
  }

  /**
   * Creates a new employee record linked to an existing profile.
   * Validates profile existence and prevents duplicate employee for the same profile.
   */
  async create(dto: CreateEmployeeDto, createdByProfileId?: string) {
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
        createdByProfileId: createdByProfileId ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        address: dto.address,
        position: dto.position,
        salary:
          dto.salary !== undefined ? new Prisma.Decimal(dto.salary) : undefined,
        commissionPerParcel:
          dto.commissionPerParcel !== undefined
            ? new Prisma.Decimal(dto.commissionPerParcel)
            : undefined,
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { employeeId: employee.employeeId },
        data: { availabilityStatus: status },
      });
      await tx.profiles.update({
        where: { id: profileId },
        data: { lastSeenAt: new Date() },
      });
      return updated;
    });
  }

  async checkIn(profileId: string) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { profileId },
      });
      if (!employee) {
        throw new NotFoundException('Employee profile not found.');
      }
      const openAttendance = await tx.attendance.findFirst({
        where: {
          employeeId: employee.employeeId,
          checkIn: { not: null },
          checkOut: null,
        },
      });
      if (openAttendance) {
        throw new ConflictException('The employee is already checked in.');
      }
      const now = new Date();
      const attendance = await tx.attendance.create({
        data: {
          employeeId: employee.employeeId,
          date: now,
          checkIn: now,
          status: 'PRESENT',
        },
      });
      await tx.employee.update({
        where: { employeeId: employee.employeeId },
        data: { availabilityStatus: 'AVAILABLE' },
      });
      await tx.profiles.update({
        where: { id: profileId },
        data: { lastSeenAt: now },
      });
      return attendance;
    });
  }

  async checkOut(profileId: string) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { profileId },
      });
      if (!employee) {
        throw new NotFoundException('Employee profile not found.');
      }
      const openAttendance = await tx.attendance.findFirst({
        where: {
          employeeId: employee.employeeId,
          checkIn: { not: null },
          checkOut: null,
        },
        orderBy: { checkIn: 'desc' },
      });
      if (!openAttendance) {
        throw new ConflictException('The employee is not checked in.');
      }
      const now = new Date();
      const attendance = await tx.attendance.update({
        where: { attendanceId: openAttendance.attendanceId },
        data: { checkOut: now },
      });
      await tx.employee.update({
        where: { employeeId: employee.employeeId },
        data: { availabilityStatus: 'OFF_DUTY' },
      });
      await tx.profiles.update({
        where: { id: profileId },
        data: { lastSeenAt: now },
      });
      return attendance;
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
        ...(dto.commissionPerParcel !== undefined && {
          commissionPerParcel: new Prisma.Decimal(dto.commissionPerParcel),
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
