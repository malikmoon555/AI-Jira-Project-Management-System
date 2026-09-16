import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'jira-connection-store.json');

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let jiraConn: any = null;
    try {
      jiraConn = await this.prisma.jiraConnection.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
    } catch (err: any) {
      this.logger.warn(`Could not fetch settings from DB: ${err.message}`);
    }

    if (!jiraConn && fs.existsSync(CONFIG_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.domain) {
          jiraConn = parsed;
        }
      } catch (e) {}
    }

    const envConfigured = Boolean(
      process.env.JIRA_HOST &&
      process.env.JIRA_HOST !== 'your-domain.atlassian.net' &&
      process.env.JIRA_API_TOKEN,
    );

    return {
      jira: {
        configured: Boolean(jiraConn || envConfigured),
        domain: jiraConn?.domain || (envConfigured ? process.env.JIRA_HOST : ''),
        email: jiraConn?.email || (envConfigured ? process.env.JIRA_EMAIL : ''),
        projectKey: jiraConn?.projectKey || process.env.JIRA_PROJECT_KEY || 'JIRA',
        status: jiraConn?.status || (envConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED'),
        lastSyncAt: jiraConn?.lastSyncAt,
        errorMessage: jiraConn?.errorMessage,
      },
      ai: {
        configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key'),
        model: process.env.OPENAI_MODEL || 'gpt-4o',
      },
      webhooks: {
        jiraWebhookUrl: '/api/webhooks/jira',
        gitHubWebhookUrl: '/api/webhooks/git/github',
        gitLabWebhookUrl: '/api/webhooks/git/gitlab',
        bitbucketWebhookUrl: '/api/webhooks/git/bitbucket',
      },
    };
  }

  async updateJiraSettings(data: {
    domain: string;
    email: string;
    apiToken: string;
    projectKey?: string;
  }) {
    const cleanDomain = data.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    try {
      const existing = await this.prisma.jiraConnection.findFirst();
      if (existing) {
        return await this.prisma.jiraConnection.update({
          where: { id: existing.id },
          data: {
            domain: cleanDomain,
            email: data.email,
            apiToken: data.apiToken,
            projectKey: data.projectKey || 'BSB',
            status: 'CONFIGURED',
          },
        });
      }

      return await this.prisma.jiraConnection.create({
        data: {
          domain: cleanDomain,
          email: data.email,
          apiToken: data.apiToken,
          projectKey: data.projectKey || 'BSB',
          status: 'CONFIGURED',
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not save Jira settings to DB: ${err.message}`);
      return {
        domain: cleanDomain,
        email: data.email,
        projectKey: data.projectKey || 'BSB',
        status: 'CONFIGURED',
      };
    }
  }
}
