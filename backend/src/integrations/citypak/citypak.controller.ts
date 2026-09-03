import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CitypakService } from './citypak.service';
import { CreateCitypakShipmentDto } from './dto/create-citypak-shipment.dto';
import { CreateCitypakPickupDto } from './dto/create-citypak-pickup.dto';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('integrations/citypak')
export class CitypakController {
  constructor(private readonly citypakService: CitypakService) {}

  @Get('shipper-profile')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin')
  getShipperProfile() {
    return this.citypakService.getShipperProfile();
  }

  @Post('shipments/:orderId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin')
  createShipment(
    @CurrentUser() profileId: string,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: CreateCitypakShipmentDto,
  ) {
    return this.citypakService.createShipment(orderId, profileId, dto);
  }

  @Get('waybills/order/:orderId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin')
  async streamWaybillByOrderId(
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Query('pageSize') pageSize = '4X6',
    @Query('perPage') perPage = '1',
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.citypakService.getWaybillPdfByOrderId(
      orderId,
      pageSize,
      perPage,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="citypak-waybill-${orderId}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Get('waybills/tracking')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin')
  async streamWaybillByTracking(
    @Query('trackingNumbers') trackingNumbersStr: string,
    @Query('pageSize') pageSize = '4X6',
    @Query('perPage') perPage = '1',
    @Res() res: Response,
  ) {
    const trackingNumbers = (trackingNumbersStr || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const pdfBuffer = await this.citypakService.getWaybillPdfByTrackingNumbers(
      trackingNumbers,
      pageSize,
      perPage,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="citypak-waybills.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Get('track/:trackingNumber')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin', 'Customer')
  trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.citypakService.trackShipmentByTrackingNumber(trackingNumber);
  }

  @Post('pickups')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin')
  createPickup(
    @CurrentUser() profileId: string,
    @Body() dto: CreateCitypakPickupDto,
  ) {
    return this.citypakService.createPickup(profileId, dto);
  }

  @Get('pickups')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin')
  listPickups(@CurrentUser() profileId: string) {
    return this.citypakService.listPickupRequests(profileId);
  }

  @Post('sync')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin', 'Customer')
  syncActiveShipments() {
    return this.citypakService.syncActiveShipments();
  }

  @Get('sync-status')
  getSyncStatus() {
    return this.citypakService.getLastSyncTimestamp();
  }
}
