import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JiraModule } from '../modules/jira/jira.module';
import { AlertModule } from '../modules/alert/alert.module';
import { RiskModule } from '../modules/risk/risk.module';
import { ReportModule } from '../modules/report/report.module';

@Module({
  imports: [JiraModule, AlertModule, RiskModule, ReportModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
