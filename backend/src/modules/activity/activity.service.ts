import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private jiraService: JiraService,
  ) {}

  async getRecentActivities(params: {
    issueId?: string;
    type?: string;
    limit?: number;
  }) {
    try {
      const where: any = {};
      if (params.issueId) {
        where.issueId = params.issueId;
      }
      if (params.type) {
        where.type = params.type;
      }

      const dbActivities = await this.prisma.activity.findMany({
        where,
        include: {
          issue: {
            select: {
              id: true,
              key: true,
              summary: true,
              canonicalStatus: true,
              isMonitoredPriority: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: params.limit || 50,
      });

      if (dbActivities && dbActivities.length > 0) return dbActivities;
    } catch (e) {}

    // Fallback to generating real activities from synced Jira data
    const synced = this.jiraService.getSyncedData();
    const issues = synced.issues || [];
    const activities: any[] = [];

    for (const i of issues) {
      if (i.updatedAt) {
        activities.push({
          id: `act-${i.key}-updated`,
          type: 'STATUS_CHANGE',
          title: `Updated card ${i.key}`,
          description: `${i.summary} (Status: ${i.status?.name || i.canonicalStatus})`,
          timestamp: i.updatedAt,
          actorName: i.assigneeName || i.reporterName || 'Jira Sync',
          issue: {
            id: i.id,
            key: i.key,
            summary: i.summary,
            canonicalStatus: i.canonicalStatus,
            isMonitoredPriority: i.isMonitoredPriority,
          },
        });
      }

      for (const comment of i.comments || []) {
        activities.push({
          id: `act-comment-${comment.id || Math.random()}`,
          type: 'COMMENT',
          title: `Comment on ${i.key}`,
          description: comment.body ? comment.body.substring(0, 100) : 'Added comment',
          timestamp: comment.timestamp || i.updatedAt,
          actorName: comment.author || 'Contributor',
          issue: {
            id: i.id,
            key: i.key,
            summary: i.summary,
            canonicalStatus: i.canonicalStatus,
            isMonitoredPriority: i.isMonitoredPriority,
          },
        });
      }
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, params.limit || 50);
  }

  async getIssueTimeline(issueKey: string) {
    try {
      const issue = await this.prisma.issue.findUnique({
        where: { key: issueKey.toUpperCase() },
        select: { id: true },
      });
      if (issue) {
        const dbActivities = await this.prisma.activity.findMany({
          where: { issueId: issue.id },
          include: {
            issue: {
              select: {
                key: true,
                summary: true,
              },
            },
          },
          orderBy: { timestamp: 'asc' },
        });
        if (dbActivities && dbActivities.length > 0) return dbActivities;
      }
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    const issueObj = (synced.issues || []).find(
      (i: any) => i.key?.toUpperCase() === issueKey.toUpperCase(),
    );
    if (!issueObj) return [];

    const timeline: any[] = [
      {
        id: `tl-${issueObj.key}-created`,
        title: `Card ${issueObj.key} Created`,
        description: `Created in Jira as ${issueObj.issueType}`,
        timestamp: issueObj.createdAt || new Date(),
        actorName: issueObj.reporterName || 'Jira User',
        issue: { key: issueObj.key, summary: issueObj.summary },
      },
      {
        id: `tl-${issueObj.key}-updated`,
        title: `Updated Status to ${issueObj.canonicalStatus}`,
        description: `Current Jira status: ${issueObj.status?.name || issueObj.canonicalStatus}`,
        timestamp: issueObj.updatedAt || new Date(),
        actorName: issueObj.assigneeName || 'Assignee',
        issue: { key: issueObj.key, summary: issueObj.summary },
      },
    ];

    for (const c of issueObj.comments || []) {
      timeline.push({
        id: `tl-comm-${c.id}`,
        title: `Comment by ${c.author}`,
        description: c.body,
        timestamp: c.timestamp,
        actorName: c.author,
        issue: { key: issueObj.key, summary: issueObj.summary },
      });
    }

    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return timeline;
  }

  async recordActivity(data: {
    issueId: string;
    type: string;
    title: string;
    description?: string;
    actorName?: string;
    actorEmail?: string;
    timestamp?: Date;
    metadata?: any;
  }) {
    const act = await this.prisma.activity.create({
      data: {
        issueId: data.issueId,
        type: data.type,
        title: data.title,
        description: data.description,
        actorName: data.actorName,
        actorEmail: data.actorEmail,
        timestamp: data.timestamp || new Date(),
        metadata: data.metadata,
      },
    });

    // Update issue last meaningful activity
    const isMeaningful = [
      'COMMENT',
      'COMMIT',
      'PR',
      'REVIEW',
      'WORKLOG',
      'ATTACHMENT',
      'STATUS_CHANGE',
      'DEV_UPDATE',
    ].includes(data.type);

    if (isMeaningful) {
      const updateData: any = {
        lastMeaningfulActivityAt: act.timestamp,
      };
      if (data.type === 'COMMIT') updateData.lastCommitAt = act.timestamp;
      if (data.type === 'COMMENT') updateData.lastCommentAt = act.timestamp;
      if (data.type === 'WORKLOG') updateData.lastWorklogAt = act.timestamp;
      if (data.type === 'STATUS_CHANGE') updateData.lastStatusChangeAt = act.timestamp;
      if (data.type === 'PR' || data.type === 'REVIEW') updateData.lastPRActivityAt = act.timestamp;

      await this.prisma.issue.update({
        where: { id: data.issueId },
        data: updateData,
      });
    }

    return act;
  }
}
