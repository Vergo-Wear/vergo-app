import { Module } from '@nestjs/common';
import { CustomizationService } from './customization.service';
import { CustomizationController } from './customization.controller';

@Module({
  providers: [CustomizationService],
  controllers: [CustomizationController],
  exports: [CustomizationService],
})
export class CustomizationModule {}
