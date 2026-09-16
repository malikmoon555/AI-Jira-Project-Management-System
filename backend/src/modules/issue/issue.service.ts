import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CanonicalStatus } from '@prisma/client';
import { JiraService, TARGET_PRIORITY_ISSUES } from '../jira/jira.service';

@Injectable()
export class IssueService {
  constructor(
    private prisma: PrismaService,
    private jiraService: JiraService,
  ) {}

  async getPriorityMonitoredIssues() {
    let issues: any[] = [];
    try {
      issues = await this.prisma.issue.findMany({
        where: {
          OR: [
            { key: { in: TARGET_PRIORITY_ISSUES } },
            { isMonitoredPriority: true },
          ],
        },
        include: {
          status: true,
          sprint: true,
          assignee: true,
          gitCommits: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          pullRequests: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
          qaValidations: {
            orderBy: { validatedAt: 'desc' },
            take: 1,
          },
          riskScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { key: 'asc' },
      });
    } catch (e) {}

    if (!issues || issues.length === 0) {
      const synced = this.jiraService.getSyncedData();
      issues = (synced.issues || []).slice(0, 5);
    }

    return issues;
  }

  async findAll(params: {
    canonicalStatus?: CanonicalStatus;
    sprintId?: string;
    assigneeId?: string;
    search?: string;
    priority?: string;
  }) {
    try {
      const where: any = {};
      if (params.canonicalStatus) where.canonicalStatus = params.canonicalStatus;
      if (params.sprintId) where.sprintId = params.sprintId;
      if (params.assigneeId) where.assigneeId = params.assigneeId;
      if (params.priority) where.priority = params.priority;
      if (params.search) {
        where.OR = [
          { key: { contains: params.search, mode: 'insensitive' } },
          { summary: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const dbIssues = await this.prisma.issue.findMany({
        where,
        include: {
          status: true,
          sprint: true,
          assignee: true,
          riskScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ isMonitoredPriority: 'desc' }, { updatedAt: 'desc' }],
      });
      if (dbIssues && dbIssues.length > 0) return dbIssues;
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    let issues = synced.issues || [];

    if (params.search) {
      const s = params.search.toLowerCase();
      issues = issues.filter(
        (i: any) =>
          i.key?.toLowerCase().includes(s) ||
          i.summary?.toLowerCase().includes(s) ||
          i.description?.toLowerCase().includes(s),
      );
    }
    if (params.canonicalStatus) {
      issues = issues.filter((i: any) => i.canonicalStatus === params.canonicalStatus);
    }
    return issues;
  }

  async findByKey(key: string) {
    const targetKey = key.toUpperCase();
    try {
      const issue = await this.prisma.issue.findUnique({
        where: { key: targetKey },
        include: {
          status: true,
          project: true,
          sprint: true,
          assignee: true,
          reporter: true,
          comments: { orderBy: { timestamp: 'desc' } },
          worklogs: { orderBy: { startedAt: 'desc' } },
          attachments: { orderBy: { timestamp: 'desc' } },
          gitCommits: { orderBy: { timestamp: 'desc' } },
          pullRequests: { include: { reviews: true }, orderBy: { createdAt: 'desc' } },
          qaValidations: { orderBy: { validatedAt: 'desc' }, take: 5 },
          uatValidations: { orderBy: { validatedAt: 'desc' }, take: 5 },
          riskScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
          alerts: { where: { isResolved: false }, orderBy: { createdAt: 'desc' } },
        },
      });
      if (issue) return issue;
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    const found = (synced.issues || []).find((i: any) => i.key?.toUpperCase() === targetKey);
    if (!found) {
      throw new NotFoundException(`Issue ${key} not found`);
    }
    return found;
  }

  async getDashboardSummary() {
    let issues: any[] = [];
    let activeSprint: any = null;

    try {
      issues = await this.prisma.issue.findMany({
        include: {
          status: true,
          riskScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
      });

      activeSprint = await this.prisma.sprint.findFirst({
        where: { state: 'active' },
        orderBy: { startDate: 'desc' },
      });
    } catch (dbErr) {}

    if (!issues || issues.length === 0) {
      const fileData = this.jiraService.getSyncedData();
      issues = fileData.issues || [];
      activeSprint = fileData.activeSprint || null;
    }

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const counts = {
      totalActive: issues.filter((i) => i.canonicalStatus !== CanonicalStatus.DONE).length,
      todo: issues.filter((i) => i.canonicalStatus === CanonicalStatus.TODO).length,
      development: issues.filter((i) => i.canonicalStatus === CanonicalStatus.DEVELOPMENT).length,
      qa: issues.filter((i) => i.canonicalStatus === CanonicalStatus.QA).length,
      uat: issues.filter((i) => i.canonicalStatus === CanonicalStatus.UAT).length,
      master: issues.filter((i) => i.canonicalStatus === CanonicalStatus.MASTER).length,
      done: issues.filter((i) => i.canonicalStatus === CanonicalStatus.DONE).length,
      highRisk: issues.filter((i) => {
        const r = i.riskScores?.[0];
        return r && (r.level === 'HIGH' || r.level === 'CRITICAL');
      }).length,
      inactive: issues.filter((i) => {
        return (
          i.canonicalStatus === CanonicalStatus.DEVELOPMENT &&
          i.lastMeaningfulActivityAt &&
          new Date(i.lastMeaningfulActivityAt) < fortyEightHoursAgo
        );
      }).length,
      blocked: issues.filter(
        (i) =>
          i.status?.name?.toLowerCase().includes('block') ||
          (Array.isArray(i.labels) && i.labels.some((l: string) => l.toLowerCase().includes('block'))),
      ).length,
      overdue: issues.filter((i) => i.dueDate && new Date(i.dueDate) < now && i.canonicalStatus !== CanonicalStatus.DONE).length,
    };

    return {
      activeSprint,
      counts,
    };
  }
}
