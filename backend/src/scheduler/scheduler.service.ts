import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JiraService } from '../modules/jira/jira.service';
import { AlertService } from '../modules/alert/alert.service';
import { RiskService } from '../modules/risk/risk.service';
import { ReportService } from '../modules/report/report.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private jiraService: JiraService,
    private alertService: AlertService,
    private riskService: RiskService,
    private reportService: ReportService,
  ) {}

  // Every 15 minutes: Synchronize Jira data
  @Cron('*/15 * * * *')
  async handleJiraSyncCron() {
    this.logger.log('Executing 15-minute Cron: Synchronizing Jira data...');
    try {
      await this.jiraService.syncAll();
    } catch (e: any) {
      this.logger.warn(`Jira sync cron skipped/failed: ${e.message}`);
    }
  }

  // Every 30 minutes: Check developer inactivity
  @Cron('*/30 * * * *')
  async handleInactivityCheckCron() {
    this.logger.log('Executing 30-minute Cron: Checking developer inactivity...');
    try {
      await this.alertService.checkInactivityAndGenerateAlerts();
    } catch (e: any) {
      this.logger.warn(`Inactivity check cron failed: ${e.message}`);
    }
  }

  // Every 1 hour: Recalculate risk scores
  @Cron('0 * * * *')
  async handleRiskRecalculationCron() {
    this.logger.log('Executing 1-hour Cron: Recalculating risk scores...');
    try {
      await this.riskService.recalculateAllRisks();
    } catch (e: any) {
      this.logger.warn(`Risk recalculation cron failed: ${e.message}`);
    }
  }

  // Every day at midnight: Generate AI PM daily report
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyReportCron() {
    this.logger.log('Executing Daily Midnight Cron: Generating AI PM report...');
    try {
      await this.reportService.generateDailyReport();
    } catch (e: any) {
      this.logger.warn(`Daily report cron failed: ${e.message}`);
    }
  }
}
