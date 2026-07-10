import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

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
}
