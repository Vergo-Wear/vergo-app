import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Polyfill BigInt to support JSON serialization in NestJS/Express responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // Normalize leading double slashes in incoming request URLs (e.g., //product-catalogue -> /product-catalogue)
  app.use((req: any, res: any, next: () => void) => {
    if (req.url && req.url.startsWith('//')) {
      req.url = req.url.replace(/^\/+/, '/');
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const rawFrontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const cleanFrontendUrl = rawFrontendUrl.replace(/\/+$/, '');

  const isLocalDevOrigin = (origin: string): boolean => {
    try {
      const url = new URL(origin);
      return (
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname.startsWith('192.168.') ||
        url.hostname.startsWith('10.') ||
        url.hostname.startsWith('172.')
      );
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (cleanOrigin === cleanFrontendUrl || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
