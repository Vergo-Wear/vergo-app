import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from './supabase.service';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { SigninDto } from './dto/signin.dto';
import { ProfileStatus } from '../common/enums/profile-status.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Registers a new customer. Pre-validates constraints, registers the auth user
   * via Supabase Auth, creates the linked database profile and customer records,
   * and rolls back Supabase Auth creation if the database inserts fail.
   */
  async customerSignup(dto: CustomerSignupDto) {
    const { email, password, firstName, lastName, username, phone, mobileNumber, defaultShippingAddress } = dto;
    const resolvedPhone = phone || mobileNumber;

    // 1. Pre-validation checks
    // Email uniqueness check
    const existingCustomerByEmail = await this.prisma.customer.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingCustomerByEmail) {
      throw new ConflictException('A customer with this email already exists.');
    }

    // Username uniqueness check (if provided)
    if (username) {
      const existingProfileByUsername = await this.prisma.profiles.findUnique({
        where: { username: username.trim() },
      });
      if (existingProfileByUsername) {
        throw new ConflictException('This username is already taken.');
      }
    }

    // Phone uniqueness check (if provided)
    if (resolvedPhone) {
      const existingCustomerByPhone = await this.prisma.customer.findFirst({
        where: { phone: resolvedPhone.trim() },
      });
      if (existingCustomerByPhone) {
        throw new ConflictException('A customer with this phone number already exists.');
      }
    }

    // Find the 'Customer' role
    const customerRole = await this.prisma.role.findFirst({
      where: {
        roleName: {
          equals: 'Customer',
          mode: 'insensitive',
        },
      },
    });

    if (!customerRole) {
      throw new BadRequestException('Customer role not configured in the database.');
    }

    // 2. Register user in Supabase Auth
    const { data: authData, error: authError } = await this.supabaseService.client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      this.logger.error(`Supabase Auth signup failed: ${authError?.message}`);
      throw new BadRequestException(authError?.message || 'Failed to register user in Supabase Auth.');
    }

    const userId = authData.user.id;

    // 3. Create database records in profiles and customer
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create profile
        const profile = await tx.profiles.create({
          data: {
            id: userId,
            roleId: customerRole.roleId,
            username: username ? username.trim() : null,
            status: ProfileStatus.ACTIVE,
          },
        });

        // Create customer record
        const customer = await tx.customer.create({
          data: {
            profileId: userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: resolvedPhone ? resolvedPhone.trim() : null,
            email: email.trim().toLowerCase(),
            defaultShippingAddress: defaultShippingAddress ? defaultShippingAddress.trim() : null,
          },
        });

        return { profile, customer };
      });

      this.logger.log(`Customer successfully created in DB and Supabase Auth with ID: ${userId}`);

      return {
        message: 'Signup successful',
        user: {
          id: userId,
          email: authData.user.email,
          role: 'Customer',
        },
        profile: {
          id: result.profile.id,
          username: result.profile.username,
          status: result.profile.status,
        },
        customer: {
          customerId: result.customer.customerId,
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
          email: result.customer.email,
          phone: result.customer.phone,
        },
      };
    } catch (dbError) {
      this.logger.error(`Database operations failed for user ID ${userId}. Rolling back Supabase registration.`, dbError);
      
      // 4. Rollback Supabase user creation if database write fails
      try {
        await this.supabaseService.adminClient.auth.admin.deleteUser(userId);
        this.logger.log(`Successfully deleted orphaned Supabase user with ID: ${userId}`);
      } catch (deleteError) {
        this.logger.error(`Failed to rollback Supabase user deletion for user ID ${userId}:`, deleteError);
      }
      
      throw dbError;
    }
  }

  /**
   * Signs in a user and returns authentication session details alongside their role.
   * If input is a phone number, resolves it to the linked email address before authenticating.
   */
  async signin(dto: SigninDto, allowedRoleName: 'Customer' | 'Employee' | 'Admin') {
    const { emailOrPhone, password } = dto;
    let email = emailOrPhone.trim();

    // 1. Resolve email if input is a phone number
    const isEmail = email.includes('@');
    if (!isEmail) {
      if (allowedRoleName === 'Customer') {
        const customer = await this.prisma.customer.findFirst({
          where: { phone: email },
        });
        if (!customer) {
          throw new UnauthorizedException('Invalid phone number or password.');
        }
        email = customer.email;
      } else if (allowedRoleName === 'Employee') {
        const employee = await this.prisma.employee.findFirst({
          where: { phone: email },
        });
        if (!employee || !employee.profileId) {
          throw new UnauthorizedException('Invalid phone number or password.');
        }
        const authUser = await this.prisma.authUser.findUnique({
          where: { id: employee.profileId },
        });
        if (!authUser || !authUser.email) {
          throw new UnauthorizedException('Invalid phone number or password.');
        }
        email = authUser.email;
      } else if (allowedRoleName === 'Admin') {
        // Find auth user directly by phone (since there is no dedicated Admin table)
        const authUser = await this.prisma.authUser.findFirst({
          where: { phone: email },
        });
        if (!authUser || !authUser.email) {
          throw new UnauthorizedException('Invalid phone number or password.');
        }
        email = authUser.email;
      }
    }

    // 2. Sign in with Supabase Auth
    const { data: authData, error: authError } = await this.supabaseService.client.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError || !authData.user || !authData.session) {
      this.logger.warn(`Auth login failed: ${authError?.message}`);
      throw new UnauthorizedException('Invalid credentials.');
    }

    const userId = authData.user.id;

    // 3. Fetch profile and verify role & active status
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!profile) {
      throw new UnauthorizedException('Profile not found.');
    }

    // Check status is active
    if (profile.status !== ProfileStatus.ACTIVE) {
      throw new ForbiddenException(
        `Account is "${profile.status}". Access is only permitted for active accounts.`,
      );
    }

    // Verify role matches
    const roleName = profile.role?.roleName;
    if (!roleName || roleName.toLowerCase() !== allowedRoleName.toLowerCase()) {
      throw new ForbiddenException(`Access denied. You do not have the required role: ${allowedRoleName}.`);
    }

    // 4. Return formatted login response
    return {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in,
      user: {
        id: userId,
        email: authData.user.email || email,
        role: allowedRoleName,
      },
    };
  }
}
