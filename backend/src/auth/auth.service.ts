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
import { GoogleCompleteProfileDto } from './dto/google-complete-profile.dto';
import { ProfileStatus } from '../common/enums/profile-status.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async refreshSession(refreshToken: string) {
    const { data, error } =
      await this.supabaseService.client.auth.refreshSession({
        refresh_token: refreshToken,
      });
    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(
        'Session refresh failed. Please sign in again.',
      );
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  /**
   * Registers a new customer. Pre-validates constraints, registers the auth user
   * via Supabase Auth, creates the linked database profile and customer records,
   * and rolls back Supabase Auth creation if the database inserts fail.
   */
  async customerSignup(dto: CustomerSignupDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      username,
      phone,
      mobileNumber,
      defaultShippingAddress,
    } = dto;

    // Normalize phone: strip leading 0, prepend +94
    const rawPhone = phone || mobileNumber;
    const resolvedPhone = rawPhone
      ? rawPhone.trim().startsWith('+94')
        ? rawPhone.trim()
        : '+94' + rawPhone.trim().replace(/^0/, '')
      : null;

    // Generate a unique username from first + last name if not provided
    const resolvedUsername = await this.generateUniqueUsername(
      username?.trim() || null,
      firstName.trim(),
      lastName.trim(),
    );

    // 1. Pre-validation checks
    // Email uniqueness check
    const existingCustomerByEmail = await this.prisma.customer.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingCustomerByEmail) {
      throw new ConflictException('A customer with this email already exists.');
    }

    // Username uniqueness check — handled by generateUniqueUsername()

    // Phone uniqueness check (if provided)
    if (resolvedPhone) {
      const existingCustomerByPhone = await this.prisma.customer.findFirst({
        where: { phone: resolvedPhone.trim() },
      });
      if (existingCustomerByPhone) {
        throw new ConflictException(
          'A customer with this phone number already exists.',
        );
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
      throw new BadRequestException(
        'Customer role not configured in the database.',
      );
    }

    // 2. Register user in Supabase Auth (admin client auto-confirms the email,
    //    allowing immediate sign-in without requiring email verification)
    const { data: authData, error: authError } =
      await this.supabaseService.adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      this.logger.error(`Supabase Auth signup failed: ${authError?.message}`);
      throw new BadRequestException(
        authError?.message || 'Failed to register user in Supabase Auth.',
      );
    }

    const userId = authData.user.id;

    // 3. Create database records in profiles and customer
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Upsert profile (to handle cases where database triggers automatically create the profile)
        const profile = await tx.profiles.upsert({
          where: { id: userId },
          update: {
            roleId: customerRole.roleId,
            username: resolvedUsername,
            status: ProfileStatus.ACTIVE,
          },
          create: {
            id: userId,
            roleId: customerRole.roleId,
            username: resolvedUsername,
            status: ProfileStatus.ACTIVE,
          },
        });

        // Upsert customer record (to handle cases where database triggers automatically create the customer record)
        const customer = await tx.customer.upsert({
          where: { email: email.trim().toLowerCase() },
          update: {
            profileId: userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: resolvedPhone,
            defaultShippingAddress: defaultShippingAddress
              ? defaultShippingAddress.trim()
              : null,
          },
          create: {
            profileId: userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: resolvedPhone,
            email: email.trim().toLowerCase(),
            defaultShippingAddress: defaultShippingAddress
              ? defaultShippingAddress.trim()
              : null,
          },
        });

        return { profile, customer };
      });

      this.logger.log(
        `Customer successfully created in DB and Supabase Auth with ID: ${userId}`,
      );

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
      this.logger.error(
        `Database operations failed for user ID ${userId}. Rolling back Supabase registration.`,
        dbError,
      );

      // 4. Rollback Supabase user creation if database write fails
      try {
        await this.supabaseService.adminClient.auth.admin.deleteUser(userId);
        this.logger.log(
          `Successfully deleted orphaned Supabase user with ID: ${userId}`,
        );
      } catch (deleteError) {
        this.logger.error(
          `Failed to rollback Supabase user deletion for user ID ${userId}:`,
          deleteError,
        );
      }

      throw dbError;
    }
  }

  /**
   * Signs in a user and returns authentication session details alongside their role.
   * If input is a phone number, resolves it to the linked email address before authenticating.
   */
  async signin(
    dto: SigninDto,
    allowedRoleName: 'Customer' | 'Employee' | 'Admin',
  ) {
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
    const { data: authData, error: authError } =
      await this.supabaseService.client.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

    if (authError || !authData || !authData.user || !authData.session) {
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
      throw new ForbiddenException(
        `Access denied. You do not have the required role: ${allowedRoleName}.`,
      );
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

  /**
   * Handles Google OAuth login/signup for customers.
   *
   * Called immediately after the client-side Supabase Google OAuth flow completes.
   * Two outcomes are possible:
   *
   * 1. Profile already exists → the user is a returning customer.
   *    Returns their session info directly (login complete).
   *
   * 2. No profile found → first time signing in via Google (new user).
   *    Returns { needsOnboarding: true } so the frontend can redirect the user
   *    to the "Complete your profile" screen. No DB records are created yet.
   */
  async googleSignin(accessToken: string) {
    // 1. Validate the token and retrieve the Supabase user
    const {
      data: { user },
      error,
    } = await this.supabaseService.client.auth.getUser(accessToken);

    if (error || !user) {
      this.logger.warn(
        `Google signin token validation failed: ${error?.message}`,
      );
      throw new UnauthorizedException(
        'Invalid or expired Google access token.',
      );
    }

    const userId = user.id;

    // 2. Check if this user already has a fully onboarded profile
    //    A trigger may auto-create a bare profile row with no roleId — treat that as a new user too.
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    const isOnboarded = profile && profile.roleId !== null;

    // New user (no profile, or trigger-created profile with no role) — send to onboarding
    if (!isOnboarded) {
      this.logger.log(
        `Google signin: new/incomplete user detected (ID: ${userId}), onboarding required.`,
      );
      return {
        needsOnboarding: true,
        user: {
          id: userId,
          email: user.email,
        },
      };
    }

    // 3. Returning user — verify account is active
    if (profile.status !== ProfileStatus.ACTIVE) {
      throw new ForbiddenException(
        `Account is "${profile.status}". Access is only permitted for active accounts.`,
      );
    }

    // 4. Returning user — must be a Customer role (all Google auth users are customers)
    const roleName = profile.role?.roleName;
    if (!roleName || roleName.toLowerCase() !== 'customer') {
      throw new ForbiddenException(
        'Access denied. Google sign-in is only available for customer accounts.',
      );
    }

    this.logger.log(
      `Google signin: returning customer logged in (ID: ${userId})`,
    );

    return {
      needsOnboarding: false,
      user: {
        id: userId,
        email: user.email,
        role: 'Customer',
      },
      profile: {
        id: profile.id,
        username: profile.username,
        status: profile.status,
      },
    };
  }

  /**
   * Completes the profile for a user who signed in via Google for the first time.
   *
   * Verifies the access token, then creates the profile and customer records in a
   * single transaction. This is the only place DB records are created for Google
   * OAuth users — ensuring no orphaned rows exist for incomplete sign-ups.
   */
  async googleCompleteProfile(dto: GoogleCompleteProfileDto) {
    const {
      accessToken,
      firstName,
      lastName,
      username,
      phone,
      defaultShippingAddress,
    } = dto;

    // 1. Validate token and get user identity
    const {
      data: { user },
      error,
    } = await this.supabaseService.client.auth.getUser(accessToken);

    if (error || !user || !user.email) {
      this.logger.warn(
        `googleCompleteProfile: token validation failed: ${error?.message}`,
      );
      throw new UnauthorizedException(
        'Invalid or expired Google access token.',
      );
    }

    const userId = user.id;
    const email = user.email.toLowerCase();

    // 2. Guard: if a fully onboarded profile already exists (has a role), don't overwrite it
    const existingProfile = await this.prisma.profiles.findUnique({
      where: { id: userId },
    });
    if (existingProfile && existingProfile.roleId !== null) {
      throw new ConflictException('A profile already exists for this account.');
    }

    // 3. Username — generate unique if not supplied by frontend
    const resolvedUsername = await this.generateUniqueUsername(
      username?.trim() || null,
      firstName.trim(),
      lastName.trim(),
    );

    // 4. Normalize phone: strip leading 0, prepend +94
    const resolvedPhone = phone
      ? phone.trim().startsWith('+94')
        ? phone.trim()
        : '+94' + phone.trim().replace(/^0/, '')
      : null;

    // 4a. Phone uniqueness check (if provided)
    if (resolvedPhone) {
      const existingPhone = await this.prisma.customer.findFirst({
        where: { phone: resolvedPhone },
      });
      if (existingPhone) {
        throw new ConflictException(
          'A customer with this phone number already exists.',
        );
      }
    }

    // 5. Resolve the Customer role
    const customerRole = await this.prisma.role.findFirst({
      where: { roleName: { equals: 'Customer', mode: 'insensitive' } },
    });
    if (!customerRole) {
      throw new BadRequestException(
        'Customer role not configured in the database.',
      );
    }

    // 6. Create profile and customer in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert handles the edge case where a DB trigger already inserted a bare profile row
      const profile = await tx.profiles.upsert({
        where: { id: userId },
        update: {
          roleId: customerRole.roleId,
          username: resolvedUsername,
          status: ProfileStatus.ACTIVE,
        },
        create: {
          id: userId,
          roleId: customerRole.roleId,
          username: resolvedUsername,
          status: ProfileStatus.ACTIVE,
        },
      });

      // Upsert customer — email comes from the verified Google account
      const customer = await tx.customer.upsert({
        where: { email },
        update: {
          profileId: userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: resolvedPhone,
          defaultShippingAddress: defaultShippingAddress
            ? defaultShippingAddress.trim()
            : null,
        },
        create: {
          profileId: userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: resolvedPhone,
          email,
          defaultShippingAddress: defaultShippingAddress
            ? defaultShippingAddress.trim()
            : null,
        },
      });

      return { profile, customer };
    });

    this.logger.log(`Google onboarding complete for user ID: ${userId}`);

    return {
      message: 'Profile created successfully',
      user: {
        id: userId,
        email,
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
  }

  /**
   * Generates a unique username.
   * If a specific username is requested, validates it is available.
   * Otherwise builds `firstname_lastname_XXXX` with a random 4-digit suffix,
   * retrying up to 10 times until a free slot is found.
   */
  private async generateUniqueUsername(
    requestedUsername: string | null,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    if (requestedUsername) {
      const taken = await this.prisma.profiles.findUnique({
        where: { username: requestedUsername },
      });
      if (taken) {
        throw new ConflictException('This username is already taken.');
      }
      return requestedUsername;
    }

    const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const base =
      cleanFirst && cleanLast
        ? `${cleanFirst}_${cleanLast}`
        : cleanFirst || cleanLast || 'user';

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${base}_${suffix}`;
      const taken = await this.prisma.profiles.findUnique({
        where: { username: candidate },
      });
      if (!taken) return candidate;
    }

    // Guaranteed unique fallback
    return `${base}_${Date.now()}`;
  }
}
