import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { DeliveryFeesService } from './delivery-fees.service';
import { CalculateDeliveryFeeDto } from './dto/calculate-delivery-fee.dto';
import { UpdateDeliveryFeeRuleDto } from './dto/update-delivery-fee-rule.dto';
import { BulkUpdateDeliveryFeeRulesDto } from './dto/bulk-update-delivery-fee-rule.dto';

@Controller()
export class DeliveryFeesController {
  constructor(private readonly deliveryFeesService: DeliveryFeesService) {}

  @Get('delivery-fees')
  getActiveRules() {
    return this.deliveryFeesService.getActiveRules();
  }

  @Get('delivery-fees/calculate')
  calculateDeliveryFee(@Query() query: CalculateDeliveryFeeDto) {
    return this.deliveryFeesService.calculateDeliveryFee(
      query.district,
      query.totalQuantity,
    );
  }

  @Get('admin/delivery-fees')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  getAllAdminRules() {
    return this.deliveryFeesService.getAllRules();
  }

  @Patch('admin/delivery-fees/bulk')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  bulkUpdateRules(@Body() dto: BulkUpdateDeliveryFeeRulesDto) {
    return this.deliveryFeesService.bulkUpdateRules(dto);
  }

  @Patch('admin/delivery-fees/:ruleId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  updateRule(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateDeliveryFeeRuleDto,
  ) {
    return this.deliveryFeesService.updateRule(ruleId, dto);
  }
}
