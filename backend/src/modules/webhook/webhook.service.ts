import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GitService } from '../git/git.service';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private gitService: GitService,
    private jiraService: JiraService,
  ) {}

  async handleJiraWebhook(payload: any) {
    const webhookEvent = payload.webhookEvent || 'unknown';
    this.logger.log(`Received Jira webhook: ${webhookEvent}`);

    try {
      await this.prisma.webhookEvent.create({
        data: {
          source: 'JIRA',
          eventType: webhookEvent,
          payload,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not save Jira webhook event to DB: ${e.message}`);
    }

    // If issue updated or created
    if (payload.issue) {
      const issueKey = payload.issue.key;
      this.logger.log(`Processing Jira webhook for issue: ${issueKey}`);
      // Re-fetch or update issue if connection exists
      const conn = await this.jiraService.getActiveConnection();
      if (conn) {
        const client = this.jiraService.createJiraClient(conn.domain, conn.email, conn.apiToken);
        try {
          await this.jiraService.fetchAndStoreJiraIssue(
            client,
            issueKey,
            undefined,
            payload.issue.key.startsWith('BSB-'),
          );
        } catch (e: any) {
          this.logger.warn(`Could not sync updated issue ${issueKey}: ${e.message}`);
        }
      }
    }

    return { received: true, event: webhookEvent };
  }

  async handleGitWebhook(provider: string, payload: any) {
    this.logger.log(`Received Git webhook from ${provider}`);

    try {
      await this.prisma.webhookEvent.create({
        data: {
          source: provider.toUpperCase(),
          eventType: 'GIT_EVENT',
          payload,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not save Git webhook event to DB: ${e.message}`);
    }

    const results: any = { commits: [], pullRequests: [] };

    // 1. GitHub Push event (commits)
    if (payload.commits && Array.isArray(payload.commits)) {
      const repoName = payload.repository?.full_name || payload.repository?.name || 'repo';
      const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'main';

      for (const c of payload.commits) {
        const saved = await this.gitService.recordCommit({
          hash: c.id,
          message: c.message,
          authorName: c.author?.name || 'Developer',
          authorEmail: c.author?.email || '',
          timestamp: new Date(c.timestamp || new Date()),
          url: c.url,
          branch,
          repoName,
          repoProvider: provider,
        });
        results.commits.push(saved.hash);
      }
    }

    // 2. GitHub Pull Request event
    if (payload.pull_request) {
      const pr = payload.pull_request;
      const repoName = payload.repository?.full_name || 'repo';
      const savedPR = await this.gitService.recordPullRequest({
        prNumber: pr.number,
        title: pr.title,
        description: pr.body,
        status: pr.state === 'closed' ? (pr.merged ? 'merged' : 'closed') : 'open',
        sourceBranch: pr.head?.ref || 'feature',
        targetBranch: pr.base?.ref || 'main',
        url: pr.html_url || '',
        authorName: pr.user?.login || 'Developer',
        authorEmail: pr.user?.email,
        repoName,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
      });
      results.pullRequests.push(savedPR.prNumber);
    }

    // 3. GitHub PR Review event
    if (payload.review && payload.pull_request) {
      const dbPR = await this.prisma.pullRequest.findFirst({
        where: { prNumber: payload.pull_request.number },
      });
      if (dbPR) {
        await this.gitService.recordPRReview({
          prId: dbPR.id,
          reviewerName: payload.review.user?.login || 'Reviewer',
          state: (payload.review.state || 'COMMENTED').toUpperCase(),
          body: payload.review.body,
          timestamp: new Date(payload.review.submitted_at || new Date()),
        });
      }
    }

    return { received: true, provider, results };
  }
}
