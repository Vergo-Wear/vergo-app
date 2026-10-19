import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { CitypakService } from './citypak.service';
import { CitypakController } from './citypak.controller';
import { CitypakWebhookController } from './citypak-webhook.controller';

@Module({
  imports: [PrismaModule, ConfigModule, NotificationsModule],
  controllers: [CitypakController, CitypakWebhookController],
  providers: [CitypakService],
  exports: [CitypakService],
})
export class CitypakModule {}
