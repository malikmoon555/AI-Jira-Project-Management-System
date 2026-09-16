import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(@Query('userId') userId?: string) {
    return this.notificationService.getNotifications(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }
}
