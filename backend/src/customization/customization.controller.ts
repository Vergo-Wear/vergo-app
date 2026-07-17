import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CustomizationService } from './customization.service';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customization')
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Get()
  getCustomization() {
    return this.customizationService.getCustomization();
  }

  @Patch()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  updateCustomization(@Body() dto: UpdateCustomizationDto) {
    return this.customizationService.updateCustomization(dto);
  }
}
