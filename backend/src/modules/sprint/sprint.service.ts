import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CanonicalStatus } from '@prisma/client';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class SprintService {
  constructor(
    private prisma: PrismaService,
    private jiraService: JiraService,
  ) {}

  async getActiveSprint() {
    let sprint: any = null;
    try {
      sprint = await this.prisma.sprint.findFirst({
        where: { state: 'active' },
        include: {
          issues: {
            include: {
              status: true,
              assignee: true,
              riskScores: {
                orderBy: { calculatedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!sprint) {
        sprint = await this.prisma.sprint.findFirst({
          orderBy: { startDate: 'desc' },
          include: {
            issues: {
              include: {
                status: true,
                assignee: true,
                riskScores: {
                  orderBy: { calculatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });
      }
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    const syncedIssues = synced.issues || [];

    if (!sprint || !sprint.issues || sprint.issues.length === 0) {
      const activeSprintMeta = synced.activeSprint || {
        name: `Active Sprint`,
        state: 'active',
        goal: 'Complete active user stories and deliver verified features.',
      };

      const totalStoryPoints = syncedIssues.reduce((acc: number, i: any) => acc + (i.storyPoints || 1), 0);
      const completedStoryPoints = syncedIssues
        .filter((i: any) => i.canonicalStatus === 'DONE')
        .reduce((acc: number, i: any) => acc + (i.storyPoints || 1), 0);
      const doneCount = syncedIssues.filter((i: any) => i.canonicalStatus === 'DONE').length;

      return {
        id: activeSprintMeta.id || 'synced-active-sprint',
        name: activeSprintMeta.name || 'Current Active Sprint',
        state: activeSprintMeta.state || 'active',
        goal: activeSprintMeta.goal || 'Complete active sprint cards.',
        issues: syncedIssues,
        metrics: {
          totalCards: syncedIssues.length,
          completedCards: doneCount,
          totalStoryPoints,
          completedStoryPoints,
          progressPercent: syncedIssues.length > 0 ? Math.round((doneCount / syncedIssues.length) * 100) : 0,
        },
      };
    }

    const issues = sprint.issues || [];
    const totalStoryPoints = issues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    const completedStoryPoints = issues
      .filter((i) => i.canonicalStatus === CanonicalStatus.DONE)
      .reduce((acc, i) => acc + (i.storyPoints || 0), 0);

    return {
      ...sprint,
      metrics: {
        totalCards: issues.length,
        completedCards: issues.filter((i) => i.canonicalStatus === CanonicalStatus.DONE).length,
        totalStoryPoints,
        completedStoryPoints,
        progressPercent: totalStoryPoints > 0
          ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
          : Math.round((issues.filter((i) => i.canonicalStatus === CanonicalStatus.DONE).length / (issues.length || 1)) * 100),
      },
    };
  }

  async getAllSprints() {
    try {
      const dbSprints = await this.prisma.sprint.findMany({
        include: {
          _count: {
            select: { issues: true },
          },
        },
        orderBy: { startDate: 'desc' },
      });
      if (dbSprints && dbSprints.length > 0) return dbSprints;
    } catch (e) {}

    const active = await this.getActiveSprint();
    return [active];
  }
}
