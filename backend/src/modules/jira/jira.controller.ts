import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { JiraService, TARGET_PRIORITY_ISSUES } from './jira.service';

@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get('status')
  async getConnectionStatus() {
    const conn = await this.jiraService.getActiveConnection();
    if (!conn || !conn.domain || conn.status === 'NOT_CONFIGURED') {
      return {
        configured: false,
        message: 'Jira integration is not configured. Please configure your Jira Cloud credentials in Settings.',
        projectKey: conn?.projectKey || 'JIRA',
        targetIssuesRequired: TARGET_PRIORITY_ISSUES,
      };
    }
    const isConfigured = conn.status === 'CONNECTED' || conn.status === 'CONFIGURED' || Boolean(conn.domain && conn.email);
    return {
      configured: isConfigured,
      id: conn.id,
      domain: conn.domain,
      email: conn.email,
      projectKey: conn.projectKey || 'JIRA',
      status: conn.status || 'CONNECTED',
      lastSyncAt: conn.lastSyncAt,
      errorMessage: conn.errorMessage,
      targetIssuesRequired: TARGET_PRIORITY_ISSUES,
    };
  }

  @Post('connect')
  async connectJira(
    @Body()
    body: {
      domain: string;
      email: string;
      apiToken: string;
      projectKey?: string;
    },
  ) {
    return this.jiraService.saveConnection(
      body.domain,
      body.email,
      body.apiToken,
      body.projectKey || 'JIRA',
    );
  }

  @Post('sync')
  async triggerSync() {
    try {
      return await this.jiraService.syncAll();
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Sync failed due to internal error',
      };
    }
  }

  @Get('target-issues')
  async getTargetIssues() {
    const conn = await this.jiraService.getActiveConnection();
    return {
      project: conn?.projectKey || 'JIRA',
      requiredKeys: TARGET_PRIORITY_ISSUES,
    };
  }
}
