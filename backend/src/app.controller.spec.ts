import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'mock-key')),
            getOrThrow: jest.fn((key: string) => (key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'mock-key')),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ test: 1 }]),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Vergo-Wear"', () => {
      expect(appController.getHello()).toBe('Vergo-Wear');
    });
  });
});
