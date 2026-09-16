import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertSeverity } from '@prisma/client';

@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  getAlerts(
    @Query('issueId') issueId?: string,
    @Query('severity') severity?: AlertSeverity,
    @Query('isResolved') isResolved?: string,
  ) {
    return this.alertService.getAlerts({
      issueId,
      severity,
      isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
    });
  }

  @Post('check-inactivity')
  triggerInactivityCheck() {
    return this.alertService.checkInactivityAndGenerateAlerts();
  }

  @Post(':id/resolve')
  resolveAlert(@Param('id') id: string) {
    return this.alertService.resolveAlert(id);
  }
}
