import { Controller, Get, Param, Query } from '@nestjs/common';
import { IssueService } from './issue.service';
import { CanonicalStatus } from '@prisma/client';

@Controller('issues')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Get('summary')
  getDashboardSummary() {
    return this.issueService.getDashboardSummary();
  }

  @Get('priority-monitored')
  getPriorityMonitored() {
    return this.issueService.getPriorityMonitoredIssues();
  }

  @Get()
  getAllIssues(
    @Query('canonicalStatus') canonicalStatus?: CanonicalStatus,
    @Query('sprintId') sprintId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.issueService.findAll({
      canonicalStatus,
      sprintId,
      assigneeId,
      priority,
      search,
    });
  }

  @Get(':key')
  getIssueByKey(@Param('key') key: string) {
    return this.issueService.findByKey(key);
  }
}
