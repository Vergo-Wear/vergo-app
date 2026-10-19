import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OptionalSupabaseAuthGuard } from '../auth/guards/optional-supabase-auth.guard';

const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined =>
    context.switchToHttp().getRequest().user,
);

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('mine')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  getMyOrders(@CurrentUser() profileId: string) {
    return this.ordersService.findCustomerOrders(profileId);
  }

  @Get('mine/:id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  getMyOrder(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.ordersService.findCustomerOrder(profileId, orderId);
  }

  @Patch('mine/:id/cancel')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  cancelMyOrder(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.ordersService.cancelCustomerOrder(profileId, orderId);
  }

  @Patch('pending-checkouts/:id/cancel')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  cancelPendingCheckout(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) checkoutId: string,
  ) {
    return this.ordersService.cancelPendingCheckout(profileId, checkoutId);
  }

  @Get('manage')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee', 'Branch Manager')
  getAllOrders(@CurrentIdentity() user: RequestUser) {
    return this.ordersService.findManagedOrders(user.id, user.role);
  }

  @Get('manage/pending-checkouts')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  getPendingCheckouts() {
    return this.ordersService.findPendingCheckouts();
  }

  @Patch('manage/pending-checkouts/:id/review')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  reviewPendingCheckout(
    @CurrentIdentity() user: RequestUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) checkoutId: string,
    @Body() dto: ReviewPaymentProofDto,
  ) {
    return this.ordersService.reviewPendingCheckout(checkoutId, dto, user.id);
  }

  @Get('manage/:id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee', 'Branch Manager')
  getManagedOrder(
    @CurrentIdentity() user: RequestUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.ordersService.findManagedOrder(orderId, user.role);
  }

  @Patch('manage/:id/status')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee', 'Branch Manager')
  updateManagedStatus(
    @CurrentIdentity() user: RequestUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateManagedStatus(
      user.id,
      user.role,
      orderId,
      dto.status,
      dto.rejectionReason,
    );
  }

  @Patch('manage/:id/claim')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee', 'Branch Manager')
  claimManagedOrder(
    @CurrentIdentity() user: RequestUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.ordersService.updateManagedStatus(
      user.id,
      user.role,
      orderId,
      'Claimed',
    );
  }

  @Post('manage/payment-proofs/expire')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  expireOverduePaymentProofs() {
    return this.ordersService.expireOverduePaymentProofs();
  }

  @Post()
  @UseGuards(OptionalSupabaseAuthGuard)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentIdentity() user?: RequestUser,
  ) {
    const pendingCheckout = await this.ordersService.create(
      createOrderDto,
      user?.id,
    );
    if (pendingCheckout.paymentMethod.toLowerCase().includes('bank')) {
      return {
        success: true,
        message: 'Bank Transfer stock reserved successfully',
        pendingCheckout,
        reservation: {
          reservationId: pendingCheckout.reservationId,
          expiresAt: pendingCheckout.expiresAt,
          status: 'Active',
        },
      };
    }
    return {
      success: true,
      message: 'Checkout submitted for admin confirmation and stock reserved',
      pendingCheckout,
    };
  }

  @Get('bank-transfer/reservations/current')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  getCurrentBankTransferReservation(@CurrentUser() profileId: string) {
    return this.ordersService.getCurrentBankTransferReservation(profileId);
  }

  @Patch('bank-transfer/reservations/:id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  updateBankTransferReservation(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) reservationId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.updateBankTransferReservation(
      profileId,
      reservationId,
      createOrderDto,
    );
  }

  @Get('bank-transfer/reservations/:id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  getBankTransferReservation(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) reservationId: string,
  ) {
    return this.ordersService.getBankTransferReservation(
      profileId,
      reservationId,
    );
  }
}
