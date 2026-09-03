import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Customer')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
    return this.notificationsService.markAsRead(profileId, notificationId);
  }
}
