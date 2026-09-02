import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CartService } from './cart.service';
import { SaveCartDto } from './dto/save-cart.dto';

@Controller('cart')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Customer', 'Admin', 'Employee')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() profileId: string) {
    return this.cartService.get(profileId);
  }

  @Put()
  saveCart(@CurrentUser() profileId: string, @Body() dto: SaveCartDto) {
    return this.cartService.save(profileId, dto);
  }

  @Delete()
  clearCart(@CurrentUser() profileId: string) {
    return this.cartService.clear(profileId);
  }
}
