import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertSeverity, CanonicalStatus } from '@prisma/client';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private prisma: PrismaService,
    private jiraService: JiraService,
  ) {}

  async checkInactivityAndGenerateAlerts() {
    this.logger.log('Running automated inactivity detection check...');
    const now = new Date();

    let devIssues: any[] = [];
    try {
      devIssues = await this.prisma.issue.findMany({
        where: {
          canonicalStatus: CanonicalStatus.DEVELOPMENT,
        },
        include: {
          assignee: true,
        },
      });
    } catch (e) {}

    if (!devIssues || devIssues.length === 0) {
      const synced = this.jiraService.getSyncedData();
      devIssues = (synced.issues || []).filter((i: any) => i.canonicalStatus === 'DEVELOPMENT');
    }

    const createdAlerts = [];

    for (const issue of devIssues) {
      const lastActivity = issue.lastMeaningfulActivityAt ? new Date(issue.lastMeaningfulActivityAt) : new Date(issue.updatedAt || now);
      const elapsedMs = now.getTime() - lastActivity.getTime();
      const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));

      if (elapsedHours > 72) {
        createdAlerts.push({
          id: `alt-72h-${issue.key}`,
          issueId: issue.id,
          type: 'INACTIVITY_72H',
          severity: AlertSeverity.CRITICAL,
          title: `Critical Inactivity: ${issue.key} (>72h)`,
          message: `${issue.key} assigned to ${issue.assigneeName || 'Unassigned'} has been in DEVELOPMENT with no meaningful activity for ${elapsedHours} hours.`,
          source: 'INACTIVITY_ENGINE',
          createdAt: new Date(),
          issue: {
            key: issue.key,
            summary: issue.summary,
            canonicalStatus: issue.canonicalStatus,
            assigneeName: issue.assigneeName,
          },
        });
      } else if (elapsedHours > 48) {
        createdAlerts.push({
          id: `alt-48h-${issue.key}`,
          issueId: issue.id,
          type: 'INACTIVITY_48H',
          severity: AlertSeverity.HIGH,
          title: `High Risk Inactivity: ${issue.key} (>48h)`,
          message: `${issue.key} assigned to ${issue.assigneeName || 'Unassigned'} has been in DEVELOPMENT with no meaningful activity for ${elapsedHours} hours.`,
          source: 'INACTIVITY_ENGINE',
          createdAt: new Date(),
          issue: {
            key: issue.key,
            summary: issue.summary,
            canonicalStatus: issue.canonicalStatus,
            assigneeName: issue.assigneeName,
          },
        });
      }
    }

    return createdAlerts;
  }

  async getAlerts(params: {
    issueId?: string;
    severity?: AlertSeverity;
    isResolved?: boolean;
  }) {
    try {
      const where: any = {};
      if (params.issueId) where.issueId = params.issueId;
      if (params.severity) where.severity = params.severity;
      if (params.isResolved !== undefined) where.isResolved = params.isResolved;

      const dbAlerts = await this.prisma.alert.findMany({
        where,
        include: {
          issue: {
            select: {
              key: true,
              summary: true,
              canonicalStatus: true,
              assigneeName: true,
              isMonitoredPriority: true,
            },
          },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      });
      if (dbAlerts && dbAlerts.length > 0) return dbAlerts;
    } catch (e) {}

    return this.checkInactivityAndGenerateAlerts();
  }

  async resolveAlert(id: string) {
    try {
      return await this.prisma.alert.update({
        where: { id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    } catch (e) {
      return { id, isResolved: true, resolvedAt: new Date() };
    }
  }
}
