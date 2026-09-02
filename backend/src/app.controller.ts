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
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

class ContactMessageDto {
  @IsString() @MinLength(2) fullName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(2) subject: string;
  @IsString() @MinLength(10) message: string;
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
  createContactMessage(@Body() dto: ContactMessageDto) {
    return this.prisma.contactMessage.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.trim().toLowerCase(),
        subject: dto.subject.trim(),
        message: dto.message.trim(),
      },
    });
  }
}
