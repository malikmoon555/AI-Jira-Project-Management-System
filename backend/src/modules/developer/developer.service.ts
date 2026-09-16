import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CanonicalStatus } from '@prisma/client';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class DeveloperService {
  constructor(
    private prisma: PrismaService,
    private jiraService: JiraService,
  ) {}

  async getDevelopersSummary() {
    let issues: any[] = [];
    try {
      issues = await this.prisma.issue.findMany({
        where: {
          assigneeName: { not: null },
        },
        include: {
          gitCommits: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          riskScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
      });
    } catch (e) {}

    if (!issues || issues.length === 0) {
      const synced = this.jiraService.getSyncedData();
      issues = synced.issues || [];
    }

    const developerMap: Record<string, any> = {};

    for (const issue of issues) {
      const devName = issue.assigneeName || 'Unassigned';
      if (!developerMap[devName]) {
        developerMap[devName] = {
          name: devName,
          email: issue.assigneeEmail,
          avatarUrl: issue.assigneeAvatarUrl,
          totalAssigned: 0,
          activeIssues: 0,
          inDevelopment: 0,
          inQA: 0,
          inUAT: 0,
          done: 0,
          highRiskCount: 0,
          issues: [],
          lastActivityAt: null,
          lastCommitAt: null,
          timeSpentTotalSec: 0,
        };
      }

      const dev = developerMap[devName];
      dev.totalAssigned += 1;
      dev.timeSpentTotalSec += issue.timeSpentSec || 0;

      const status = issue.canonicalStatus || 'TODO';

      if (status === 'DEVELOPMENT' || status === CanonicalStatus.DEVELOPMENT) dev.inDevelopment += 1;
      if (status === 'QA' || status === CanonicalStatus.QA) dev.inQA += 1;
      if (status === 'UAT' || status === CanonicalStatus.UAT) dev.inUAT += 1;
      if (status === 'DONE' || status === CanonicalStatus.DONE) dev.done += 1;
      if (status !== 'DONE' && status !== CanonicalStatus.DONE) dev.activeIssues += 1;

      const risk = issue.riskScores?.[0];
      if (risk && (risk.level === 'HIGH' || risk.level === 'CRITICAL')) {
        dev.highRiskCount += 1;
      }

      dev.issues.push({
        key: issue.key,
        summary: issue.summary,
        status,
        priority: issue.priority,
        lastMeaningfulActivityAt: issue.lastMeaningfulActivityAt || issue.updatedAt,
      });

      const actTime = issue.lastMeaningfulActivityAt ? new Date(issue.lastMeaningfulActivityAt) : (issue.updatedAt ? new Date(issue.updatedAt) : null);
      if (actTime) {
        if (!dev.lastActivityAt || actTime > dev.lastActivityAt) {
          dev.lastActivityAt = actTime;
        }
      }

      const commitTime = issue.gitCommits?.[0]?.timestamp ? new Date(issue.gitCommits[0].timestamp) : null;
      if (commitTime) {
        if (!dev.lastCommitAt || commitTime > dev.lastCommitAt) {
          dev.lastCommitAt = commitTime;
        }
      }
    }

    const result = Object.values(developerMap);
    result.sort((a, b) => b.activeIssues - a.activeIssues);
    return result;
  }
}
