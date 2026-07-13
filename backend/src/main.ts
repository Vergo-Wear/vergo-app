import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Polyfill BigInt to support JSON serialization in NestJS/Express responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
