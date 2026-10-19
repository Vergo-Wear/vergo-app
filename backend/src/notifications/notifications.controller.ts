import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Customer', 'Admin', 'Employee', 'Branch Manager')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('request-stock')
  @Roles('Employee', 'Admin', 'Branch Manager')
  requestStock(
    @CurrentUser() profileId: string,
    @Body()
    dto: {
      sku: string;
      productName?: string;
      size?: string;
      color?: string;
      quantity: number;
      notes?: string;
    },
  ) {
    return this.notificationsService.requestStock(profileId, dto);
  }

  @Get()
  getMyNotifications(@CurrentUser() profileId: string) {
    return this.notificationsService.findCustomerNotifications(profileId);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() profileId: string) {
    return this.notificationsService.unreadCount(profileId);
  }

  @Get(':id')
  getNotification(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) notificationId: string,
  ) {
    return this.notificationsService.findCustomerNotification(
      profileId,
      notificationId,
    );
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) notificationId: string,
  ) {
    return this.notificationsService.setReadStatus(profileId, notificationId, true);
  }

  @Patch(':id/unread')
  markAsUnread(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) notificationId: string,
  ) {
    return this.notificationsService.setReadStatus(profileId, notificationId, false);
  }

  @Delete('all')
  deleteAllNotifications(@CurrentUser() profileId: string) {
    return this.notificationsService.deleteAllNotifications(profileId);
  }

  @Delete(':id')
  deleteNotification(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(profileId, notificationId);
  }
}
