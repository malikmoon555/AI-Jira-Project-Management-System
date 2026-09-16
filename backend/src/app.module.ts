import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JiraModule } from './modules/jira/jira.module';
import { ProjectModule } from './modules/project/project.module';
import { SprintModule } from './modules/sprint/sprint.module';
import { IssueModule } from './modules/issue/issue.module';
import { ActivityModule } from './modules/activity/activity.module';
import { GitModule } from './modules/git/git.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { QAModule } from './modules/qa/qa.module';
import { UATModule } from './modules/uat/uat.module';
import { AlertModule } from './modules/alert/alert.module';
import { RiskModule } from './modules/risk/risk.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AIModule } from './modules/ai/ai.module';
import { ReportModule } from './modules/report/report.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    JiraModule,
    ProjectModule,
    SprintModule,
    IssueModule,
    ActivityModule,
    GitModule,
    WebhookModule,
    DeveloperModule,
    QAModule,
    UATModule,
    AlertModule,
    RiskModule,
    NotificationModule,
    AIModule,
    ReportModule,
    SettingsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
