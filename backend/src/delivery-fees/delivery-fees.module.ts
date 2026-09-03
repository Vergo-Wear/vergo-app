import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DeliveryFeesController } from './delivery-fees.controller';
import { DeliveryFeesService } from './delivery-fees.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryFeesController],
  providers: [DeliveryFeesService],
  exports: [DeliveryFeesService],
})
export class DeliveryFeesModule {}
