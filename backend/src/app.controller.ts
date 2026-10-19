import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SupabaseAuthGuard } from './auth/guards/supabase-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class ContactFormDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail({}, { message: 'Invalid email address format.' })
  email: string;

  @IsString()
  @MinLength(2)
  subject: string;

  @IsString()
  @MinLength(5)
  message: string;
}

export class CheckContactDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address format.' })
  email?: string;

  @IsOptional()
  @Matches(/^(?:\+94|0)?[1-9][0-9]{8}$/, {
    message:
      'Phone number must be a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).',
  })
  phone?: string;
}

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) { }

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
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
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

    if (email) {
      emailExists = Boolean(
        await this.prisma.customer.findUnique({ where: { email } }),
      );
    }
    if (phone) {
      const normalizedPhone = phone.startsWith('+94')
        ? phone
        : `+94${phone.replace(/\D/g, '').replace(/^0/, '')}`;
      phoneExists = Boolean(
        await this.prisma.customer.findFirst({
          where: { phone: { in: [phone, normalizedPhone] } },
        }),
      );
    }
    this.logger.log(
      `Checked contact in DB. emailExists=${emailExists}, phoneExists=${phoneExists}`,
    );

    return {
      emailExists,
      phoneExists,
    };
  }

  @Post('/contact')
  async submitContact(@Body() dto: ContactFormDto) {
    try {
      const googleFormUrl =
        process.env.GOOGLE_FORM_RESPONSE_URL ||
        'https://docs.google.com/forms/u/0/d/e/1FAIpQLScQm8fXIOkrtj5nlmwMWzneAcll5u4PudqJjCw9LhNn0aSfOg/formResponse';
      const entryName = process.env.GOOGLE_FORM_ENTRY_NAME || 'entry.1897634418';
      const entryEmail = process.env.GOOGLE_FORM_ENTRY_EMAIL || 'entry.457820340';
      const entrySubject = process.env.GOOGLE_FORM_ENTRY_SUBJECT || 'entry.2108323';
      const entryMessage = process.env.GOOGLE_FORM_ENTRY_MESSAGE || 'entry.197243906';

      const formParams = new URLSearchParams();
      formParams.append(entryName, dto.fullName.trim());
      formParams.append(entryEmail, dto.email.trim());
      formParams.append(entrySubject, dto.subject.trim());
      formParams.append(entryMessage, dto.message.trim());

      await fetch(googleFormUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
      });

      this.logger.log(`Forwarded contact form submission for ${dto.email} to Google Form.`);
      return {
        success: true,
        message: 'Your message has been sent successfully!',
      };
    } catch (err) {
      this.logger.error(`Error submitting contact message to Google Form: ${err}`);
      return {
        success: true,
        message: 'Your message has been sent successfully!',
      };
    }
  }
}
