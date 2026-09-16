import { Controller, Get, Query, Param } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  getActivities(
    @Query('issueId') issueId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getRecentActivities({
      issueId,
      type,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('timeline/:key')
  getTimeline(@Param('key') key: string) {
    return this.activityService.getIssueTimeline(key);
  }
}
