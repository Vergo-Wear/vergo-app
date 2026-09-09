import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

// Polyfill BigInt to support JSON serialization in NestJS/Express responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ limit: '15mb', extended: true }));

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

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching frontend URL
      if (!origin || origin.replace(/\/+$/, '') === cleanFrontendUrl) {
        callback(null, true);
      } else {
        callback(null, true); // Alternatively allow clean match or allow all allowed origins
      }
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
