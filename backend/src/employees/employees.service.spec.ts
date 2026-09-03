import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../auth/supabase.service';
import { EmailService } from '../email/email.service';
import { CreateEmployeeAccountDto } from './dto/create-employee-account.dto';

describe('EmployeesService — createEmployeeAccount', () => {
  let service: EmployeesService;
  let prismaMock: any;
  let supabaseMock: any;
  let emailMock: any;

  const dto: CreateEmployeeAccountDto = {
    firstName: 'John',
    lastName: 'Perera',
    email: 'john@example.com',
    phone: '0771234567',
    branchId: 'b1c2d3e4-0000-0000-0000-000000000001',
    position: 'Sales Assistant',
    address: 'Jaffna',
  };

  const employeeRole = { roleId: 'role-employee-uuid', roleName: 'Employee' };
  const branch = {
    branchId: dto.branchId,
    name: 'Jaffna Branch',
    address: 'Jaffna',
    phone: '0212222222',
  };
  const authUserId = 'auth-user-uuid';

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    prismaMock = {
      authUser: { findFirst: jest.fn() },
      employee: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      attendance: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findFirst: jest.fn() },
      branch: { findUnique: jest.fn(), findMany: jest.fn() },
      profiles: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(prismaMock)),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };

    supabaseMock = {
      client: {
        auth: { resetPasswordForEmail: jest.fn().mockResolvedValue({}) },
      },
      adminClient: {
        auth: {
          admin: {
            createUser: jest.fn(),
            deleteUser: jest.fn().mockResolvedValue({}),
          },
        },
      },
    };

    emailMock = {
      sendEmployeeWelcomeEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: EmailService, useValue: emailMock },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  const arrangeHappyPath = () => {
    prismaMock.authUser.findFirst.mockResolvedValue(null);
    prismaMock.employee.findFirst.mockResolvedValue(null);
    prismaMock.role.findFirst.mockResolvedValue(employeeRole);
    prismaMock.branch.findUnique.mockResolvedValue(branch);
    supabaseMock.adminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: authUserId, email: dto.email } },
      error: null,
    });
    prismaMock.profiles.upsert.mockResolvedValue({
      id: authUserId,
      roleId: employeeRole.roleId,
      status: 'active',
    });
    prismaMock.employee.create.mockResolvedValue({
      employeeId: 'employee-uuid',
      profileId: authUserId,
      branchId: dto.branchId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: '+94771234567',
      position: dto.position,
    });
  };

  it('creates auth user, profile with Employee role, and branch-linked employee', async () => {
    arrangeHappyPath();
    const adminProfileId = 'admin-profile-uuid';

    const result = await service.createEmployeeAccount(dto, adminProfileId);

    expect(supabaseMock.adminClient.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: dto.email, email_confirm: true }),
    );
    // Password is randomly generated, never taken from the request
    const createUserArgs =
      supabaseMock.adminClient.auth.admin.createUser.mock.calls[0][0];
    expect(createUserArgs.password).toEqual(expect.any(String));
    expect(createUserArgs.password.length).toBeGreaterThanOrEqual(12);

    // profiles.id = auth user id, role = Employee role
    expect(prismaMock.profiles.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: authUserId },
        create: expect.objectContaining({
          id: authUserId,
          roleId: employeeRole.roleId,
        }),
      }),
    );

    // employee.profile_id = profile id, employee.branch_id = selected branch
    expect(prismaMock.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profileId: authUserId,
          branchId: dto.branchId,
          createdByProfileId: adminProfileId,
          position: dto.position,
        }),
      }),
    );

    expect(result.message).toBe('Employee account created successfully.');
    // Credentials are returned once so the admin can hand them over
    expect(result.credentials).toEqual({
      email: dto.email,
      password: createUserArgs.password,
    });
  });

  it('rejects a duplicate email without creating any records', async () => {
    prismaMock.authUser.findFirst.mockResolvedValue({
      id: 'existing',
      email: dto.email,
    });

    await expect(service.createEmployeeAccount(dto)).rejects.toThrow(
      ConflictException,
    );
    expect(
      supabaseMock.adminClient.auth.admin.createUser,
    ).not.toHaveBeenCalled();
    expect(prismaMock.employee.create).not.toHaveBeenCalled();
  });

  it('fails with a configuration error when the Employee role is missing', async () => {
    prismaMock.authUser.findFirst.mockResolvedValue(null);
    prismaMock.employee.findFirst.mockResolvedValue(null);
    prismaMock.role.findFirst.mockResolvedValue(null);

    await expect(service.createEmployeeAccount(dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(
      supabaseMock.adminClient.auth.admin.createUser,
    ).not.toHaveBeenCalled();
  });

  it('rejects an invalid branch before creating the auth user', async () => {
    prismaMock.authUser.findFirst.mockResolvedValue(null);
    prismaMock.employee.findFirst.mockResolvedValue(null);
    prismaMock.role.findFirst.mockResolvedValue(employeeRole);
    prismaMock.branch.findUnique.mockResolvedValue(null);

    await expect(service.createEmployeeAccount(dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(
      supabaseMock.adminClient.auth.admin.createUser,
    ).not.toHaveBeenCalled();
  });

  it('maps a Supabase duplicate-email error to a ConflictException', async () => {
    prismaMock.authUser.findFirst.mockResolvedValue(null);
    prismaMock.employee.findFirst.mockResolvedValue(null);
    prismaMock.role.findFirst.mockResolvedValue(employeeRole);
    prismaMock.branch.findUnique.mockResolvedValue(branch);
    prismaMock.profiles.findUnique.mockResolvedValue(null);
    supabaseMock.adminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: {
        message: 'A user with this email address has already been registered',
      },
    });

    await expect(service.createEmployeeAccount(dto)).rejects.toThrow(
      ConflictException,
    );
    expect(prismaMock.employee.create).not.toHaveBeenCalled();
  });

  it('rolls back the Supabase auth user when database writes fail', async () => {
    arrangeHappyPath();
    prismaMock.$transaction.mockRejectedValue(new Error('db down'));

    await expect(service.createEmployeeAccount(dto)).rejects.toThrow('db down');
    expect(supabaseMock.adminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
      authUserId,
    );
  });

  describe('removeEmployeeAccount', () => {
    const employeeRow = {
      employeeId: 'employee-uuid',
      profileId: authUserId,
      firstName: 'John',
      lastName: 'Perera',
    };

    it('deletes the auth user and cleans up profile and employee rows', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(employeeRow);
      supabaseMock.adminClient.auth.admin.deleteUser.mockResolvedValue({
        error: null,
      });
      prismaMock.profiles.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });
      prismaMock.employee.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await service.removeEmployeeAccount('employee-uuid');

      expect(
        supabaseMock.adminClient.auth.admin.deleteUser,
      ).toHaveBeenCalledWith(authUserId);
      expect(prismaMock.profiles.deleteMany).toHaveBeenCalledWith({
        where: { id: authUserId },
      });
      expect(prismaMock.employee.deleteMany).toHaveBeenCalledWith({
        where: { employeeId: 'employee-uuid' },
      });
      expect(result.message).toBe('Employee removed successfully.');
    });

    it('throws NotFound for an unknown employee id', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(null);

      await expect(
        service.removeEmployeeAccount('missing-uuid'),
      ).rejects.toThrow('not found');
      expect(
        supabaseMock.adminClient.auth.admin.deleteUser,
      ).not.toHaveBeenCalled();
    });

    it('maps a Supabase deletion failure to a clear conflict error', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(employeeRow);
      supabaseMock.adminClient.auth.admin.deleteUser.mockResolvedValue({
        error: { message: 'Database error deleting user' },
      });

      await expect(
        service.removeEmployeeAccount('employee-uuid'),
      ).rejects.toThrow(ConflictException);
    });

    it('removes an employee row that has no linked profile', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        ...employeeRow,
        profileId: null,
      });
      prismaMock.employee.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await service.removeEmployeeAccount('employee-uuid');

      expect(
        supabaseMock.adminClient.auth.admin.deleteUser,
      ).not.toHaveBeenCalled();
      expect(result.message).toBe('Employee removed successfully.');
    });
  });

  it('lists branches for the dropdown', async () => {
    prismaMock.branch.findMany.mockResolvedValue([branch]);
    const result = await service.listBranches();
    expect(result).toEqual([branch]);
    expect(prismaMock.branch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } }),
    );
  });

  describe('attendance availability transaction', () => {
    const employeeId = 'employee-uuid';
    const profileId = 'profile-uuid';

    it('checks in and marks the employee available in the same transaction', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        employeeId,
        profileId,
      });
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      prismaMock.attendance.create.mockResolvedValue({
        attendanceId: 'attendance-1',
        employeeId,
        status: 'PRESENT',
      });

      await service.checkIn(profileId);

      expect(prismaMock.attendance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employeeId,
          checkIn: expect.any(Date),
          status: 'PRESENT',
        }),
      });
      expect(prismaMock.employee.update).toHaveBeenCalledWith({
        where: { employeeId },
        data: { availabilityStatus: 'AVAILABLE' },
      });
    });

    it('checks out the open session and marks the employee off duty', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        employeeId,
        profileId,
      });
      prismaMock.attendance.findFirst.mockResolvedValue({
        attendanceId: 'attendance-1',
        employeeId,
        checkIn: new Date(),
        checkOut: null,
      });
      prismaMock.attendance.update.mockResolvedValue({
        attendanceId: 'attendance-1',
        employeeId,
        checkOut: new Date(),
      });

      await service.checkOut(profileId);

      expect(prismaMock.attendance.update).toHaveBeenCalledWith({
        where: { attendanceId: 'attendance-1' },
        data: { checkOut: expect.any(Date) },
      });
      expect(prismaMock.employee.update).toHaveBeenCalledWith({
        where: { employeeId },
        data: { availabilityStatus: 'OFF_DUTY' },
      });
    });
  });
});
