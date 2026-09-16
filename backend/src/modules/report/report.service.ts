import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CanonicalStatus } from '@prisma/client';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private prisma: PrismaService,
    private jiraService: JiraService,
  ) {}

  async generateDailyReport() {
    this.logger.log('Generating AI Daily PM Report...');
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    let issues: any[] = [];
    try {
      issues = await this.prisma.issue.findMany({
        include: {
          status: true,
          assignee: true,
          gitCommits: { take: 1, orderBy: { timestamp: 'desc' } },
          riskScores: { take: 1, orderBy: { calculatedAt: 'desc' } },
          qaValidations: { take: 1, orderBy: { validatedAt: 'desc' } },
        },
      });
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    if (!issues || issues.length === 0) {
      issues = synced.issues || [];
    }

    const activeCardsCount = issues.filter((i) => i.canonicalStatus !== 'DONE' && i.canonicalStatus !== CanonicalStatus.DONE).length;
    const completedCardsCount = issues.filter((i) => i.canonicalStatus === 'DONE' || i.canonicalStatus === CanonicalStatus.DONE).length;
    const devCardsCount = issues.filter((i) => i.canonicalStatus === 'DEVELOPMENT' || i.canonicalStatus === CanonicalStatus.DEVELOPMENT).length;
    const qaCardsCount = issues.filter((i) => i.canonicalStatus === 'QA' || i.canonicalStatus === CanonicalStatus.QA).length;
    const uatCardsCount = issues.filter((i) => i.canonicalStatus === 'UAT' || i.canonicalStatus === CanonicalStatus.UAT).length;
    const masterCardsCount = issues.filter((i) => i.canonicalStatus === 'MASTER' || i.canonicalStatus === CanonicalStatus.MASTER).length;
    const doneCardsCount = completedCardsCount;

    const blockedCards = issues.filter(
      (i) =>
        i.summary?.toLowerCase().includes('block') ||
        (i.labels && i.labels.some((l: string) => l.toLowerCase().includes('block'))),
    );
    const blockedCardsCount = blockedCards.length;

    const inactiveCards = issues.filter(
      (i) =>
        (i.canonicalStatus === 'DEVELOPMENT' || i.canonicalStatus === CanonicalStatus.DEVELOPMENT) &&
        i.lastMeaningfulActivityAt &&
        new Date(i.lastMeaningfulActivityAt) < fortyEightHoursAgo,
    );
    const inactiveCardsCount = inactiveCards.length;
    const highRiskCardsCount = 0;

    const recommendedActions = [];
    if (inactiveCardsCount > 0) {
      recommendedActions.push({
        priority: 'HIGH',
        action: `Follow up with assignees of ${inactiveCardsCount} inactive card(s) (${inactiveCards.map((i) => i.key).join(', ')}) in DEVELOPMENT with no updates for >48h.`,
      });
    }
    if (blockedCardsCount > 0) {
      recommendedActions.push({
        priority: 'CRITICAL',
        action: `Expedite unblocking blockers for ${blockedCards.map((i) => i.key).join(', ')}.`,
      });
    }
    if (recommendedActions.length === 0) {
      recommendedActions.push({
        priority: 'MEDIUM',
        action: 'Sprint execution is pacing steadily. Continue tracking card progress.',
      });
    }

    const projKey = issues[0]?.key?.split('-')[0] || 'Jira';
    const aiSummary = `${projKey} Project Daily Health Report for ${now.toDateString()}. Currently tracking ${issues.length} active cards from Jira. Sprint has ${activeCardsCount} active cards and ${completedCardsCount} completed.`;

    const reportObj = {
      id: `report-${now.toISOString().split('T')[0]}`,
      title: `${projKey} Project Daily PM Report - ${now.toISOString().split('T')[0]}`,
      reportDate: now,
      sprintProgress: {
        sprintName: synced.activeSprint?.name || 'Current Active Sprint',
        completionRatio: `${completedCardsCount}/${issues.length || 1}`,
      },
      activeCardsCount,
      completedCardsCount,
      devCardsCount,
      qaCardsCount,
      uatCardsCount,
      masterCardsCount,
      doneCardsCount,
      blockedCardsCount,
      inactiveCardsCount,
      highRiskCardsCount,
      topRisks: [],
      recommendedActions,
      aiSummary,
      createdAt: now,
    };

    try {
      return await this.prisma.aIReport.create({
        data: {
          title: reportObj.title,
          reportDate: now,
          sprintProgress: reportObj.sprintProgress as any,
          activeCardsCount,
          completedCardsCount,
          devCardsCount,
          qaCardsCount,
          uatCardsCount,
          masterCardsCount,
          doneCardsCount,
          blockedCardsCount,
          inactiveCardsCount,
          highRiskCardsCount,
          topRisks: [] as any,
          recommendedActions: recommendedActions as any,
          aiSummary,
        },
      });
    } catch (e) {
      return reportObj;
    }
  }

  async getAllReports() {
    try {
      const dbReports = await this.prisma.aIReport.findMany({
        orderBy: { reportDate: 'desc' },
        take: 30,
      });
      if (dbReports && dbReports.length > 0) return dbReports;
    } catch (e) {}

    const latest = await this.generateDailyReport();
    return [latest];
  }

  async getLatestReport() {
    try {
      const report = await this.prisma.aIReport.findFirst({
        orderBy: { reportDate: 'desc' },
      });
      if (report) return report;
    } catch (e) {}

    return this.generateDailyReport();
  }
}
