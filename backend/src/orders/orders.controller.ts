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
import { PaymentProofService } from '../payment-proof/payment-proof.service';
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
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentProofService: PaymentProofService,
  ) {}

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

  @Get('manage')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee')
  getAllOrders() {
    return this.ordersService.findAllOrders();
  }

  @Get('manage/:id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee')
  getManagedOrder(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.ordersService.findManagedOrder(orderId);
  }

  @Patch('manage/:id/status')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee')
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
    );
  }

  @Patch('manage/:id/payment-proofs/:proofId/review')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee')
  reviewPaymentProof(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Param('proofId', new ParseUUIDPipe({ version: '4' })) proofId: string,
    @Body() dto: ReviewPaymentProofDto,
  ) {
    return this.ordersService.reviewPaymentProof(orderId, proofId, dto);
  }

  @Post('manage/payment-proofs/expire')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin', 'Employee')
  expireOverduePaymentProofs() {
    return this.ordersService.expireOverduePaymentProofs();
  }

  @Post()
  @UseGuards(OptionalSupabaseAuthGuard)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentIdentity() user?: RequestUser,
  ) {
    const order = await this.ordersService.create(createOrderDto, user?.id);
    return {
      success: true,
      message: 'Order created successfully',
      order,
    };
  }

  @Get(':id/payment-proof')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  getPaymentProof(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.paymentProofService.getForCustomerOrder(profileId, orderId);
  }
}
