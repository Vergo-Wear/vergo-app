import { Module } from '@nestjs/common';
import { PaymentProofController } from './payment-proof.controller';
import { PaymentProofService } from './payment-proof.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [PaymentProofController],
  providers: [PaymentProofService],
  exports: [PaymentProofService],
})
export class PaymentProofModule {}
