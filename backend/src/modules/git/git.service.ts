import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  constructor(private prisma: PrismaService) {}

  extractIssueKeys(text: string): string[] {
    if (!text) return [];
    const match = text.match(/BSB-\d+/gi);
    if (!match) return [];
    return Array.from(new Set(match.map((m) => m.toUpperCase())));
  }

  async recordCommit(data: {
    hash: string;
    message: string;
    authorName: string;
    authorEmail: string;
    timestamp: Date;
    url?: string;
    branch?: string;
    repoName?: string;
    repoProvider?: string;
  }) {
    const shortHash = data.hash.substring(0, 7);
    const issueKeys = this.extractIssueKeys(data.message);

    // Get or create repo
    let repo = null;
    if (data.repoName) {
      repo = await this.prisma.gitRepository.upsert({
        where: { id: data.repoName }, // fallback lookup or findFirst
        update: {},
        create: {
          id: data.repoName,
          provider: data.repoProvider || 'github',
          name: data.repoName,
          fullName: data.repoName,
          url: data.url || `https://github.com/${data.repoName}`,
        },
      }).catch(async () => {
        return this.prisma.gitRepository.findFirst({
          where: { name: data.repoName },
        });
      });
    }

    // Find linked issue if keys present
    let primaryIssueId: string | null = null;
    if (issueKeys.length > 0) {
      const issue = await this.prisma.issue.findUnique({
        where: { key: issueKeys[0] },
      });
      if (issue) {
        primaryIssueId = issue.id;
      }
    }

    const commit = await this.prisma.gitCommit.upsert({
      where: { hash: data.hash },
      update: {
        message: data.message,
        branch: data.branch,
        url: data.url,
        issueId: primaryIssueId,
      },
      create: {
        hash: data.hash,
        shortHash,
        message: data.message,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        branch: data.branch,
        url: data.url,
        timestamp: data.timestamp,
        repositoryId: repo?.id,
        issueId: primaryIssueId,
      },
    });

    // If linked to an issue, record unified activity & update issue lastMeaningfulActivity
    if (primaryIssueId) {
      await this.prisma.activity.create({
        data: {
          issueId: primaryIssueId,
          type: 'COMMIT',
          title: `Git commit [${shortHash}] by ${data.authorName}`,
          description: data.message,
          timestamp: data.timestamp,
          actorName: data.authorName,
          actorEmail: data.authorEmail,
          metadata: { hash: data.hash, branch: data.branch, url: data.url },
        },
      });

      await this.prisma.issue.update({
        where: { id: primaryIssueId },
        data: {
          lastCommitAt: data.timestamp,
          lastMeaningfulActivityAt: data.timestamp,
        },
      });
    }

    return commit;
  }

  async recordPullRequest(data: {
    prNumber: number;
    title: string;
    description?: string;
    status: string; // open, closed, merged
    sourceBranch: string;
    targetBranch: string;
    url: string;
    authorName: string;
    authorEmail?: string;
    repoName?: string;
    mergedAt?: Date;
    closedAt?: Date;
  }) {
    const combinedText = `${data.title} ${data.description || ''} ${data.sourceBranch}`;
    const issueKeys = this.extractIssueKeys(combinedText);

    let primaryIssueId: string | null = null;
    if (issueKeys.length > 0) {
      const issue = await this.prisma.issue.findUnique({
        where: { key: issueKeys[0] },
      });
      if (issue) {
        primaryIssueId = issue.id;
      }
    }

    let repo = null;
    const repoName = data.repoName || 'default-repo';
    try {
      repo = await this.prisma.gitRepository.upsert({
        where: { id: repoName },
        update: {},
        create: {
          id: repoName,
          provider: 'github',
          name: repoName,
          fullName: repoName,
          url: data.url || `https://github.com/${repoName}`,
        },
      });
    } catch (e: any) {
      try {
        repo = await this.prisma.gitRepository.findFirst({ where: { name: repoName } });
      } catch (err: any) {}
    }

    let pr: any = null;
    try {
      pr = await this.prisma.pullRequest.upsert({
        where: {
          repositoryId_prNumber: {
            repositoryId: repo?.id || repoName,
            prNumber: data.prNumber,
          },
        },
        update: {
          title: data.title,
          description: data.description,
          status: data.status,
          mergedAt: data.mergedAt,
          closedAt: data.closedAt,
          issueId: primaryIssueId,
        },
        create: {
          prNumber: data.prNumber,
          title: data.title,
          description: data.description,
          status: data.status,
          sourceBranch: data.sourceBranch,
          targetBranch: data.targetBranch,
          url: data.url,
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          repositoryId: repo?.id || repoName,
          issueId: primaryIssueId,
          mergedAt: data.mergedAt,
          closedAt: data.closedAt,
        },
      });
    } catch (dbErr: any) {
      this.logger.warn(`Could not save PullRequest to DB: ${dbErr.message}`);
      pr = { id: `pr-${data.prNumber}`, prNumber: data.prNumber, ...data };
    }

    if (primaryIssueId) {
      const now = new Date();
      await this.prisma.activity.create({
        data: {
          issueId: primaryIssueId,
          type: 'PR',
          title: `PR #${data.prNumber} (${data.status}): ${data.title}`,
          description: `By ${data.authorName} [${data.sourceBranch} → ${data.targetBranch}]`,
          timestamp: now,
          actorName: data.authorName,
          metadata: { prNumber: data.prNumber, status: data.status, url: data.url },
        },
      });

      await this.prisma.issue.update({
        where: { id: primaryIssueId },
        data: {
          lastPRActivityAt: now,
          lastMeaningfulActivityAt: now,
        },
      });
    }

    return pr;
  }

  async recordPRReview(data: {
    prId: string;
    reviewerName: string;
    state: string; // APPROVED, CHANGES_REQUESTED, COMMENTED
    body?: string;
    timestamp?: Date;
  }) {
    const review = await this.prisma.pullRequestReview.create({
      data: {
        pullRequestId: data.prId,
        reviewerName: data.reviewerName,
        state: data.state,
        body: data.body,
        submittedAt: data.timestamp || new Date(),
      },
      include: {
        pullRequest: true,
      },
    });

    if (review.pullRequest.issueId) {
      const date = data.timestamp || new Date();
      await this.prisma.activity.create({
        data: {
          issueId: review.pullRequest.issueId,
          type: 'REVIEW',
          title: `Code review: ${data.state} by ${data.reviewerName}`,
          description: data.body,
          timestamp: date,
          actorName: data.reviewerName,
          metadata: { state: data.state },
        },
      });

      await this.prisma.issue.update({
        where: { id: review.pullRequest.issueId },
        data: {
          lastPRActivityAt: date,
          lastMeaningfulActivityAt: date,
        },
      });
    }

    return review;
  }
}
