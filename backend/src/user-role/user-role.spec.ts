import { Test, TestingModule } from '@nestjs/testing';
import { UserRoleService, UserIdentificationResult } from './user-role.service';
import { UserRoleController } from './user-role.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('UserRole (Service & Controller)', () => {
  let service: UserRoleService;
  let controller: UserRoleController;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      authUser: {
        findUnique: jest.fn(),
      },
      profiles: {
        findUnique: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRoleController],
      providers: [
        UserRoleService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UserRoleService>(UserRoleService);
    controller = module.get<UserRoleController>(UserRoleController);
  });

  describe('UserRoleService.identifyUser', () => {
    it('should return Guest for null or undefined userId', async () => {
      const resultNull = await service.identifyUser(null);
      const resultUndef = await service.identifyUser(undefined);

      expect(resultNull).toEqual({ accountType: 'Guest' });
      expect(resultUndef).toEqual({ accountType: 'Guest' });
    });

    it('should return Guest if user is not in auth.users', async () => {
      prismaMock.authUser.findUnique.mockResolvedValue(null);

      const result = await service.identifyUser('user-id-not-exist');

      expect(result).toEqual({ accountType: 'Guest' });
      expect(prismaMock.authUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-not-exist' },
      });
    });

    it('should return Guest (with user info) if user exists in auth.users but has no profile in profiles table', async () => {
      const mockAuthUser = {
        id: 'user-no-profile',
        email: 'no-profile@test.com',
        phone: '12345678',
        createdAt: new Date(),
      };
      prismaMock.authUser.findUnique.mockResolvedValue(mockAuthUser);
      prismaMock.profiles.findUnique.mockResolvedValue(null);

      const result = await service.identifyUser('user-no-profile');

      expect(result).toEqual({
        accountType: 'Guest',
        user: mockAuthUser,
      });
    });

    it('should return Guest if user has profile but no role assigned', async () => {
      const mockAuthUser = {
        id: 'user-no-role',
        email: 'no-role@test.com',
        phone: '12345678',
        createdAt: new Date(),
      };
      const mockProfile = {
        id: 'user-no-role',
        roleId: null,
        username: 'noroleuser',
        status: 'active',
        createdAt: new Date(),
        role: null,
      };

      prismaMock.authUser.findUnique.mockResolvedValue(mockAuthUser);
      prismaMock.profiles.findUnique.mockResolvedValue(mockProfile);

      const result = await service.identifyUser('user-no-role');

      expect(result).toEqual({
        accountType: 'Guest',
        user: mockAuthUser,
        profile: {
          id: mockProfile.id,
          roleId: mockProfile.roleId,
          username: mockProfile.username,
          status: mockProfile.status,
          createdAt: mockProfile.createdAt,
        },
        customer: null,
        employee: null,
      });
    });

    it('should identify Admin role correctly', async () => {
      const mockAuthUser = {
        id: 'admin-id',
        email: 'admin@test.com',
        phone: null,
        createdAt: new Date(),
      };
      const mockProfile = {
        id: 'admin-id',
        roleId: 'role-admin-id',
        username: 'admin_user',
        status: 'active',
        createdAt: new Date(),
        role: {
          roleId: 'role-admin-id',
          roleName: 'Admin',
        },
      };

      prismaMock.authUser.findUnique.mockResolvedValue(mockAuthUser);
      prismaMock.profiles.findUnique.mockResolvedValue(mockProfile);

      const result = await service.identifyUser('admin-id');

      expect(result.accountType).toBe('Admin');
      expect(result.user?.id).toBe('admin-id');
      expect(result.profile?.roleId).toBe('role-admin-id');
      expect(result.customer).toBeNull();
      expect(result.employee).toBeNull();
    });

    it('should identify Customer role and retrieve customer details by profile_id', async () => {
      const mockAuthUser = {
        id: 'customer-id',
        email: 'customer@test.com',
        phone: '98765432',
        createdAt: new Date(),
      };
      const mockProfile = {
        id: 'customer-id',
        roleId: 'role-cust-id',
        username: 'customer_user',
        status: 'active',
        createdAt: new Date(),
        role: {
          roleId: 'role-cust-id',
          roleName: 'Customer',
        },
      };
      const mockCustomerDetails = {
        customerId: 'cust-details-id',
        profileId: 'customer-id',
        firstName: 'John',
        lastName: 'Doe',
        phone: '98765432',
        email: 'customer@test.com',
        defaultShippingAddress: '123 St',
        createdAt: new Date(),
      };

      prismaMock.authUser.findUnique.mockResolvedValue(mockAuthUser);
      prismaMock.profiles.findUnique.mockResolvedValue(mockProfile);
      prismaMock.customer.findFirst.mockResolvedValue(mockCustomerDetails);

      const result = await service.identifyUser('customer-id');

      expect(result.accountType).toBe('Customer');
      expect(result.user?.email).toBe('customer@test.com');
      expect(result.customer).toEqual(mockCustomerDetails);
      expect(result.employee).toBeNull();
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: { profileId: 'customer-id' },
      });
    });

    it('should identify Employee role and retrieve employee details by profile_id', async () => {
      const mockAuthUser = {
        id: 'employee-id',
        email: 'employee@test.com',
        phone: '11112222',
        createdAt: new Date(),
      };
      const mockProfile = {
        id: 'employee-id',
        roleId: 'role-emp-id',
        username: 'employee_user',
        status: 'active',
        createdAt: new Date(),
        role: {
          roleId: 'role-emp-id',
          roleName: 'Employee',
        },
      };
      const mockEmployeeDetails = {
        employeeId: 'emp-details-id',
        profileId: 'employee-id',
        branchId: 'branch-id',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '11112222',
        address: '456 Rd',
        position: 'Manager',
        hireDate: new Date(),
      };

      prismaMock.authUser.findUnique.mockResolvedValue(mockAuthUser);
      prismaMock.profiles.findUnique.mockResolvedValue(mockProfile);
      prismaMock.employee.findFirst.mockResolvedValue(mockEmployeeDetails);

      const result = await service.identifyUser('employee-id');

      expect(result.accountType).toBe('Employee');
      expect(result.user?.phone).toBe('11112222');
      expect(result.employee).toEqual(mockEmployeeDetails);
      expect(result.customer).toBeNull();
      expect(prismaMock.employee.findFirst).toHaveBeenCalledWith({
        where: { profileId: 'employee-id' },
      });
    });
  });

  describe('Customer Check Methods', () => {
    it('checkCustomerByEmail should return true if customer exists', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({
        customerId: 'id',
        email: 'test@email.com',
      });

      const exists = await service.checkCustomerByEmail('test@email.com');

      expect(exists).toBe(true);
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: 'test@email.com',
            mode: 'insensitive',
          },
        },
      });
    });

    it('checkCustomerByEmail should return false if email is empty or customer not found', async () => {
      prismaMock.customer.findFirst.mockResolvedValue(null);

      expect(await service.checkCustomerByEmail('')).toBe(false);
      expect(await service.checkCustomerByEmail('notfound@email.com')).toBe(
        false,
      );
    });

    it('checkCustomerByPhone should return true if customer exists', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({
        customerId: 'id',
        phone: '123456789',
      });

      const exists = await service.checkCustomerByPhone('123456789');

      expect(exists).toBe(true);
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: {
          phone: {
            equals: '123456789',
          },
        },
      });
    });

    it('checkCustomerByPhone should return false if phone is empty or customer not found', async () => {
      prismaMock.customer.findFirst.mockResolvedValue(null);

      expect(await service.checkCustomerByPhone('')).toBe(false);
      expect(await service.checkCustomerByPhone('999999')).toBe(false);
    });
  });

  describe('UserRoleController', () => {
    it('should expose identify route', async () => {
      const mockResult: UserIdentificationResult = { accountType: 'Guest' };
      jest.spyOn(service, 'identifyUser').mockResolvedValue(mockResult);

      const result = await controller.identifyUser('test-id');

      expect(result).toBe(mockResult);
      expect(service.identifyUser).toHaveBeenCalledWith('test-id');
    });

    it('should expose check-email route', async () => {
      jest.spyOn(service, 'checkCustomerByEmail').mockResolvedValue(true);

      const result = await controller.checkCustomerByEmail('test@email.com');

      expect(result).toEqual({ exists: true });
      expect(service.checkCustomerByEmail).toHaveBeenCalledWith(
        'test@email.com',
      );
    });

    it('should expose check-phone route', async () => {
      jest.spyOn(service, 'checkCustomerByPhone').mockResolvedValue(false);

      const result = await controller.checkCustomerByPhone('1234');

      expect(result).toEqual({ exists: false });
      expect(service.checkCustomerByPhone).toHaveBeenCalledWith('1234');
    });
  });
});
