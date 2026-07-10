import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Customer, Employee } from '@prisma/client';

export type AccountType = 'Customer' | 'Admin' | 'Employee' | 'Guest';

export interface UserIdentificationResult {
  accountType: AccountType;
  user?: {
    id: string;
    email: string | null;
    phone: string | null;
    createdAt: Date | null;
  } | null;
  profile?: {
    id: string;
    roleId: string | null;
    username: string | null;
    status: string | null;
    createdAt: Date | null;
  } | null;
  customer?: {
    customerId: string;
    profileId: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string;
    defaultShippingAddress: string | null;
    createdAt: Date | null;
  } | null;
  employee?: {
    employeeId: string;
    profileId: string | null;
    branchId: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    address: string | null;
    position: string | null;
    hireDate: Date | null;
  } | null;
}

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identifies the role and details of a user by their user ID.
   * If the user is not found, or not logged in, returns a Guest account type.
   */
  async identifyUser(
    userId: string | null | undefined,
  ): Promise<UserIdentificationResult> {
    if (!userId) {
      return { accountType: 'Guest' };
    }

    try {
      // 1. Find user in auth.users
      const authUser = await this.prisma.authUser.findUnique({
        where: { id: userId },
      });

      if (!authUser) {
        return { accountType: 'Guest' };
      }

      // 2. Find profile by auth user ID
      const profile = await this.prisma.profiles.findUnique({
        where: { id: userId },
        include: {
          role: true,
        },
      });

      if (!profile) {
        return {
          accountType: 'Guest',
          user: {
            id: authUser.id,
            email: authUser.email,
            phone: authUser.phone,
            createdAt: authUser.createdAt,
          },
        };
      }

      // 3. Read role name using profiles.role_id
      const roleName = profile.role?.roleName;

      let accountType: AccountType = 'Guest';
      let customer: Customer | null = null;
      let employee: Employee | null = null;

      if (roleName) {
        const lowerRole = roleName.toLowerCase();
        if (lowerRole === 'admin') {
          accountType = 'Admin';
        } else if (lowerRole === 'employee') {
          accountType = 'Employee';
          // 5. Find employee details using employee.profile_id
          employee = await this.prisma.employee.findFirst({
            where: { profileId: userId },
          });
        } else if (lowerRole === 'customer') {
          accountType = 'Customer';
          // 4. Find customer details using customer.profile_id
          customer = await this.prisma.customer.findFirst({
            where: { profileId: userId },
          });
        }
      }

      return {
        accountType,
        user: {
          id: authUser.id,
          email: authUser.email,
          phone: authUser.phone,
          createdAt: authUser.createdAt,
        },
        profile: {
          id: profile.id,
          roleId: profile.roleId,
          username: profile.username,
          status: profile.status,
          createdAt: profile.createdAt,
        },
        customer: customer
          ? {
              customerId: customer.customerId,
              profileId: customer.profileId,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              email: customer.email,
              defaultShippingAddress: customer.defaultShippingAddress,
              createdAt: customer.createdAt,
            }
          : null,
        employee: employee
          ? {
              employeeId: employee.employeeId,
              profileId: employee.profileId,
              branchId: employee.branchId,
              firstName: employee.firstName,
              lastName: employee.lastName,
              phone: employee.phone,
              address: employee.address,
              position: employee.position,
              hireDate: employee.hireDate,
            }
          : null,
      };
    } catch (error) {
      this.logger.error(`Error identifying user with ID ${userId}:`, error);
      return { accountType: 'Guest' };
    }
  }

  /**
   * Checks if an existing customer is registered with the given email.
   * Returns true if a customer exists, false otherwise.
   */
  async checkCustomerByEmail(email: string): Promise<boolean> {
    if (!email) {
      return false;
    }
    try {
      const customer = await this.prisma.customer.findFirst({
        where: {
          email: {
            equals: email.trim(),
            mode: 'insensitive',
          },
        },
      });
      return !!customer;
    } catch (error) {
      this.logger.error(`Error checking customer by email ${email}:`, error);
      return false;
    }
  }

  /**
   * Checks if an existing customer is registered with the given phone number.
   * Returns true if a customer exists, false otherwise.
   */
  async checkCustomerByPhone(phone: string): Promise<boolean> {
    if (!phone) {
      return false;
    }
    try {
      const customer = await this.prisma.customer.findFirst({
        where: {
          phone: {
            equals: phone.trim(),
          },
        },
      });
      return !!customer;
    } catch (error) {
      this.logger.error(`Error checking customer by phone ${phone}:`, error);
      return false;
    }
  }
}
