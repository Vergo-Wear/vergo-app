import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { IsEmail, IsOptional, Matches } from 'class-validator';

export class CheckContactDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address format.' })
  email?: string;

  @IsOptional()
  @Matches(/^(?:\+94|0)?[1-9][0-9]{8}$/, {
    message: 'Phone number must be a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).'
  })
  phone?: string;
}

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/health')
  healthCheck() {
    return {
      success: true,
      message: 'Backend running successfully',
    };
  }

  @Get('/db-test')
  async dbTest() {
    try {
      const result = await this.prisma.$queryRaw`SELECT 1 as test`;
      return {
        success: true,
        message: 'Successfully connected to the database',
        result,
      };
    } catch (error) {
      this.logger.error('Database connection test failed:', error);
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to connect to the database',
      });
    }
  }
  @Post('/checkout/check-contact')
  async checkContact(@Body() body: CheckContactDto) {
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();

    let emailExists = false;
    let phoneExists = false;

    // database check with query raw
    try {
      if (email) {
        const emailResults = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM "profiles" WHERE LOWER("email") = $1 LIMIT 1`,
          email
        );
        emailExists = emailResults && emailResults.length > 0;
      }

      if (phone) {
        const cleanEnteredPhone = phone.replace(/[^0-9+]/g, '');
        const phoneResults = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM "profiles" WHERE regexp_replace("phone", '[^0-9+]', '', 'g') = $1 LIMIT 1`,
          cleanEnteredPhone
        );
        phoneExists = phoneResults && phoneResults.length > 0;
      }
      
      this.logger.log(`Checked contact in DB. emailExists=${emailExists}, phoneExists=${phoneExists}`);
    } catch (dbError) {
      this.logger.warn(
        `Database query failed or profiles table not found. Falling back to mock checks. Error: ${dbError.message}`
      );

      // Fallback: mock dataset of existing customers
      const EXISTING_CUSTOMERS = [
        { email: 'julian@verso.com', phone: '+1 (555) 000-0000' },
        { email: 'jane.doe@example.com', phone: '+1 (555) 111-1111' },
      ];

      if (email) {
        emailExists = EXISTING_CUSTOMERS.some(
          (c) => c.email.toLowerCase() === email
        );
      }

      if (phone) {
        const cleanEnteredPhone = phone.replace(/[^0-9+]/g, '');
        phoneExists = EXISTING_CUSTOMERS.some((c) => {
          const cleanCustomerPhone = c.phone.replace(/[^0-9+]/g, '');
          return cleanCustomerPhone === cleanEnteredPhone;
        });
      }
    }

    return {
      emailExists,
      phoneExists,
    };
  }
}
