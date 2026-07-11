import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from './supabase.service';
import { ConflictException, UnauthorizedException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';

describe('Auth Module (Controller & Service)', () => {
  let service: AuthService;
  let controller: AuthController;
  let prismaMock: any;
  let supabaseMock: any;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    prismaMock = {
      customer: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      profiles: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
      authUser: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    supabaseMock = {
      client: {
        auth: {
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
        },
      },
      adminClient: {
        auth: {
          admin: {
            deleteUser: jest.fn(),
          },
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    controller = module.get<AuthController>(AuthController);
  });

  describe('customerSignup', () => {
    const signupDto = {
      email: 'new@test.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      phone: '1234567890',
    };

    it('should throw ConflictException if email is already taken', async () => {
      prismaMock.customer.findUnique.mockResolvedValue({ email: 'new@test.com' });

      await expect(service.customerSignup(signupDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username is already taken', async () => {
      prismaMock.customer.findUnique.mockResolvedValue(null);
      prismaMock.profiles.findUnique.mockResolvedValue({ username: 'johndoe' });

      await expect(service.customerSignup(signupDto)).rejects.toThrow(ConflictException);
    });

    it('should sign up user in Supabase and create profile & customer in DB', async () => {
      prismaMock.customer.findUnique.mockResolvedValue(null);
      prismaMock.profiles.findUnique.mockResolvedValue(null);
      prismaMock.customer.findFirst.mockResolvedValue(null);
      prismaMock.role.findFirst.mockResolvedValue({ roleId: 'role-id-123', roleName: 'Customer' });

      supabaseMock.client.auth.signUp.mockResolvedValue({
        data: { user: { id: 'supabase-user-id', email: 'new@test.com' } },
        error: null,
      });

      prismaMock.profiles.create.mockResolvedValue({
        id: 'supabase-user-id',
        username: 'johndoe',
        status: 'active',
      });

      prismaMock.customer.create.mockResolvedValue({
        customerId: 'customer-id-123',
        profileId: 'supabase-user-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'new@test.com',
        phone: '1234567890',
      });

      const response = await service.customerSignup(signupDto);

      expect(response.message).toBe('Signup successful');
      expect(response.user.id).toBe('supabase-user-id');
      expect(response.customer.customerId).toBe('customer-id-123');
      expect(supabaseMock.client.auth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'password123',
      });
    });

    it('should delete Supabase user if database operation fails', async () => {
      prismaMock.customer.findUnique.mockResolvedValue(null);
      prismaMock.profiles.findUnique.mockResolvedValue(null);
      prismaMock.customer.findFirst.mockResolvedValue(null);
      prismaMock.role.findFirst.mockResolvedValue({ roleId: 'role-id-123', roleName: 'Customer' });

      supabaseMock.client.auth.signUp.mockResolvedValue({
        data: { user: { id: 'supabase-user-id', email: 'new@test.com' } },
        error: null,
      });

      prismaMock.profiles.create.mockRejectedValue(new Error('DB write failed'));

      await expect(service.customerSignup(signupDto)).rejects.toThrow('DB write failed');
      expect(supabaseMock.adminClient.auth.admin.deleteUser).toHaveBeenCalledWith('supabase-user-id');
    });
  });

  describe('signin', () => {
    const signinDto = {
      emailOrPhone: 'user@test.com',
      password: 'password123',
    };

    it('should throw ForbiddenException if user has incorrect role', async () => {
      supabaseMock.client.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-id', email: 'user@test.com' },
          session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 },
        },
        error: null,
      });

      prismaMock.profiles.findUnique.mockResolvedValue({
        id: 'user-id',
        status: 'active',
        role: { roleName: 'Customer' },
      });

      await expect(service.signin(signinDto, 'Employee')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if account status is inactive', async () => {
      supabaseMock.client.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-id', email: 'user@test.com' },
          session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 },
        },
        error: null,
      });

      prismaMock.profiles.findUnique.mockResolvedValue({
        id: 'user-id',
        status: 'inactive',
        role: { roleName: 'Customer' },
      });

      await expect(service.signin(signinDto, 'Customer')).rejects.toThrow(ForbiddenException);
    });

    it('should successfully authenticate customer and resolve phone to email', async () => {
      const phoneSignin = { emailOrPhone: '1234567890', password: 'password123' };

      prismaMock.customer.findFirst.mockResolvedValue({ email: 'user@test.com', phone: '1234567890' });

      supabaseMock.client.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-id', email: 'user@test.com' },
          session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 },
        },
        error: null,
      });

      prismaMock.profiles.findUnique.mockResolvedValue({
        id: 'user-id',
        status: 'active',
        role: { roleName: 'Customer' },
      });

      const response = await service.signin(phoneSignin, 'Customer');

      expect(response.accessToken).toBe('token');
      expect(response.user.role).toBe('Customer');
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({ where: { phone: '1234567890' } });
    });
  });

  describe('controller endpoints', () => {
    it('should route customer/signup', async () => {
      const signupDto = {
        email: 'new@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };
      jest.spyOn(service, 'customerSignup').mockResolvedValue({ message: 'Success' } as any);

      const res = await controller.customerSignup(signupDto);
      expect(res).toEqual({ message: 'Success' });
      expect(service.customerSignup).toHaveBeenCalledWith(signupDto);
    });

    it('should route customer/signin', async () => {
      const signinDto = { emailOrPhone: 'user@test.com', password: 'password123' };
      jest.spyOn(service, 'signin').mockResolvedValue({ accessToken: 'token' } as any);

      const res = await controller.customerSignin(signinDto);
      expect(res).toEqual({ accessToken: 'token' });
      expect(service.signin).toHaveBeenCalledWith(signinDto, 'Customer');
    });

    it('should route employee/signin', async () => {
      const signinDto = { emailOrPhone: 'user@test.com', password: 'password123' };
      jest.spyOn(service, 'signin').mockResolvedValue({ accessToken: 'token' } as any);

      const res = await controller.employeeSignin(signinDto);
      expect(res).toEqual({ accessToken: 'token' });
      expect(service.signin).toHaveBeenCalledWith(signinDto, 'Employee');
    });

    it('should route admin/signin', async () => {
      const signinDto = { emailOrPhone: 'user@test.com', password: 'password123' };
      jest.spyOn(service, 'signin').mockResolvedValue({ accessToken: 'token' } as any);

      const res = await controller.adminSignin(signinDto);
      expect(res).toEqual({ accessToken: 'token' });
      expect(service.signin).toHaveBeenCalledWith(signinDto, 'Admin');
    });
  });
});
