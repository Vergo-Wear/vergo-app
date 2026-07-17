import { Module } from '@nestjs/common';
import { PaymentProofController } from './payment-proof.controller';
import { PaymentProofService } from './payment-proof.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockReservationModule } from '../stock-reservation/stock-reservation.module';

@Module({
  imports: [CloudinaryModule, NotificationsModule, StockReservationModule],
  controllers: [PaymentProofController],
  providers: [PaymentProofService],
  exports: [PaymentProofService],
})
export class PaymentProofModule {}
