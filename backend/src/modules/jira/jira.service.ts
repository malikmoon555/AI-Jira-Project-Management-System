import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';
import { CanonicalStatus, GateResult, AlertSeverity } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export const TARGET_PRIORITY_ISSUES = [
  'BSB-2771',
  'BSB-2652',
  'BSB-2559',
  'BSB-2606',
  'BSB-2690',
];

const CONFIG_FILE_PATH = path.join(process.cwd(), 'jira-connection-store.json');
const DATA_STORE_FILE_PATH = path.join(process.cwd(), 'jira-data-store.json');

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private inMemoryConnection: any = null;

  constructor(private prisma: PrismaService) {}

  readDataFromFile(): { issues: any[]; activeSprint: any; lastSyncAt: string | null } {
    if (fs.existsSync(DATA_STORE_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(DATA_STORE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.issues)) {
          return parsed;
        }
      } catch (e) {}
    }
    return { issues: [], activeSprint: null, lastSyncAt: null };
  }

  writeDataToFile(data: { issues: any[]; activeSprint: any; lastSyncAt: string | null }) {
    try {
      fs.writeFileSync(DATA_STORE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {}
  }

  getSyncedData() {
    return this.readDataFromFile();
  }

  private readConnectionFromFile(): any {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.domain) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  }

  private writeConnectionToFile(conn: any) {
    try {
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(conn, null, 2), 'utf-8');
    } catch (e) {}
  }

  async getActiveConnection() {
    try {
      let conn = await this.prisma.jiraConnection.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (!conn) {
        const host = process.env.JIRA_HOST;
        const email = process.env.JIRA_EMAIL;
        const token = process.env.JIRA_API_TOKEN;
        const projectKey = process.env.JIRA_PROJECT_KEY || 'BSB';

        if (host && email && token && host !== 'your-domain.atlassian.net') {
          try {
            conn = await this.prisma.jiraConnection.create({
              data: {
                domain: host.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                email,
                apiToken: token,
                projectKey,
                status: 'CONFIGURED',
              },
            });
          } catch (err: any) {
            this.logger.warn(`Could not save initial Jira connection to DB: ${err.message}`);
          }
        }
      }

      if (conn) {
        this.inMemoryConnection = conn;
        this.writeConnectionToFile(conn);
        return conn;
      }
    } catch (e: any) {
      this.logger.warn(`Database query failed in getActiveConnection: ${e.message}`);
    }

    const fileConn = this.readConnectionFromFile();
    if (fileConn) {
      this.inMemoryConnection = fileConn;
      return fileConn;
    }

    return this.inMemoryConnection;
  }

  createJiraClient(domain: string, email: string, apiToken: string): AxiosInstance {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const baseURL = `https://${cleanDomain}`;
    const token = Buffer.from(`${email}:${apiToken}`).toString('base64');

    return axios.create({
      baseURL,
      headers: {
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });
  }

  async testConnection(domain: string, email: string, apiToken: string, projectKey = process.env.JIRA_PROJECT_KEY || 'SPM') {
    const client = this.createJiraClient(domain, email, apiToken);
    try {
      const userRes = await client.get('/rest/api/3/myself');
      let projectRes = null;
      try {
        projectRes = await client.get(`/rest/api/3/project/${projectKey}`);
      } catch (e) {
        return {
          success: false,
          user: userRes.data,
          error: `Authenticated as ${userRes.data.displayName}, but could not access project '${projectKey}'. Make sure the project exists and the account has Browse Projects permission.`,
        };
      }

      return {
        success: true,
        user: {
          accountId: userRes.data.accountId,
          displayName: userRes.data.displayName,
          emailAddress: userRes.data.emailAddress,
        },
        project: {
          id: projectRes.data.id,
          key: projectRes.data.key,
          name: projectRes.data.name,
        },
      };
    } catch (err: any) {
      const msg = err.response?.data?.errorMessages?.join(', ') || err.message;
      return {
        success: false,
        error: `Jira authentication failed: ${msg}`,
      };
    }
  }

  async saveConnection(domain: string, email: string, apiToken: string, projectKey = process.env.JIRA_PROJECT_KEY || 'SPM') {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const test = await this.testConnection(cleanDomain, email, apiToken, projectKey);

    let conn: any = null;
    try {
      const existing = await this.prisma.jiraConnection.findFirst();
      if (existing) {
        conn = await this.prisma.jiraConnection.update({
          where: { id: existing.id },
          data: {
            domain: cleanDomain,
            email,
            apiToken,
            projectKey,
            status: test.success ? 'CONNECTED' : 'ERROR',
            errorMessage: test.success ? null : test.error,
          },
        });
      } else {
        conn = await this.prisma.jiraConnection.create({
          data: {
            domain: cleanDomain,
            email,
            apiToken,
            projectKey,
            status: test.success ? 'CONNECTED' : 'ERROR',
            errorMessage: test.success ? null : test.error,
          },
        });
      }
    } catch (dbErr: any) {
      this.logger.warn(`Prisma save connection failed (Database offline): ${dbErr.message}`);
    }

    if (!conn) {
      conn = {
        id: this.inMemoryConnection?.id || 'in-memory-jira-conn',
        domain: cleanDomain,
        email,
        apiToken,
        projectKey,
        status: test.success ? 'CONNECTED' : 'ERROR',
        errorMessage: test.success ? null : test.error,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    this.inMemoryConnection = conn;
    this.writeConnectionToFile(conn);

    if (test.success) {
      this.syncAll().catch((err) =>
        this.logger.warn(`Auto sync after save connection notice: ${err.message}`),
      );
    }

    return {
      connection: conn,
      testResult: test,
    };
  }

  mapStatusToCanonical(statusName: string): CanonicalStatus {
    const s = (statusName || '').trim().toUpperCase();
    if (s.includes('TODO') || s.includes('BACKLOG') || s.includes('OPEN') || s.includes('TO DO')) {
      return CanonicalStatus.TODO;
    }
    if (
      s.includes('DEVELOPMENT') ||
      s.includes('IN PROGRESS') ||
      s.includes('DOING') ||
      s.includes('WIP') ||
      s.includes('CODE REVIEW')
    ) {
      return CanonicalStatus.DEVELOPMENT;
    }
    if (s.includes('QA') || s.includes('TEST') || s.includes('VERIF')) {
      return CanonicalStatus.QA;
    }
    if (s.includes('UAT') || s.includes('STAGING') || s.includes('ACCEPTANCE')) {
      return CanonicalStatus.UAT;
    }
    if (s.includes('MASTER') || s.includes('RELEASE') || s.includes('DEPLOYED') || s.includes('PROD')) {
      return CanonicalStatus.MASTER;
    }
    if (s.includes('DONE') || s.includes('CLOSED') || s.includes('RESOLVED')) {
      return CanonicalStatus.DONE;
    }
    return CanonicalStatus.TODO;
  }

  async syncAll() {
    const conn = await this.getActiveConnection();
    if (!conn) {
      return {
        success: false,
        error: 'Jira integration is not configured. Please configure your Jira Cloud credentials in Settings.',
      };
    }

    const client = this.createJiraClient(conn.domain, conn.email, conn.apiToken);
    const syncErrors: string[] = [];

    // 1. Sync Project Info
    let dbProject = null;
    try {
      const projRes = await client.get(`/rest/api/3/project/${conn.projectKey}`);
      try {
        dbProject = await this.prisma.jiraProject.upsert({
          where: { key: conn.projectKey },
          update: {
            name: projRes.data.name,
            jiraId: projRes.data.id,
            projectType: projRes.data.projectTypeKey,
            avatarUrl: projRes.data.avatarUrls?.['48x48'],
          },
          create: {
            key: conn.projectKey,
            name: projRes.data.name,
            jiraId: projRes.data.id,
            projectType: projRes.data.projectTypeKey,
            avatarUrl: projRes.data.avatarUrls?.['48x48'],
          },
        });
      } catch (dbErr: any) {
        this.logger.warn(`Database offline, skipping JiraProject DB upsert: ${dbErr.message}`);
      }

      // Sync project statuses
      try {
        const statusRes = await client.get(`/rest/api/3/project/${conn.projectKey}/statuses`);
        for (const issueTypeObj of statusRes.data) {
          for (const st of issueTypeObj.statuses || []) {
            const canonical = this.mapStatusToCanonical(st.name);
            if (dbProject?.id) {
              await this.prisma.issueStatus.upsert({
                where: { jiraId: st.id },
                update: {
                  name: st.name,
                  colorCategory: st.statusCategory?.colorName,
                  projectId: dbProject.id,
                },
                create: {
                  jiraId: st.id,
                  name: st.name,
                  canonicalStatus: canonical,
                  colorCategory: st.statusCategory?.colorName,
                  projectId: dbProject.id,
                },
              });
            }
          }
        }
      } catch (stErr: any) {
        this.logger.warn(`Could not sync project statuses to DB: ${stErr.message}`);
      }
    } catch (e: any) {
      this.logger.error(`Error syncing project ${conn.projectKey}: ${e.message}`);
      syncErrors.push(`Project fetch error: ${e.message}`);
    }

    // 2. Sync Priority Target Issues for conn.projectKey
    const targetResults: any[] = [];
    const matchingPriorityKeys = TARGET_PRIORITY_ISSUES.filter(k => k.startsWith(`${conn.projectKey}-`));
    for (const key of matchingPriorityKeys) {
      try {
        const issueData = await this.fetchAndStoreJiraIssue(client, key, dbProject?.id, true);
        targetResults.push({ key, success: true, id: issueData.id });
      } catch (err: any) {
        const errorMsg = err.response?.data?.errorMessages?.join(', ') || err.message;
        this.logger.warn(`Could not sync priority issue ${key}: ${errorMsg}`);
        targetResults.push({ key, success: false, error: errorMsg });
      }
    }

    // 3. Sync Active Sprint and Remaining Cards
    let activeSprint = null;
    try {
      // Find board for project
      try {
        const boardRes = await client.get(`/rest/agile/1.0/board?projectKeyOrId=${conn.projectKey}`);
        if (boardRes.data.values?.length > 0) {
          const board = boardRes.data.values[0];
          let dbBoard = null;
          try {
            dbBoard = await this.prisma.jiraBoard.upsert({
              where: { jiraId: String(board.id) },
              update: { name: board.name, type: board.type, projectId: dbProject?.id || '' },
              create: {
                jiraId: String(board.id),
                name: board.name,
                type: board.type,
                projectId: dbProject?.id || '',
              },
            });
          } catch (dbErr: any) {
            this.logger.warn(`Database offline, skipping JiraBoard DB upsert: ${dbErr.message}`);
          }

          // Get sprints
          const sprintRes = await client.get(`/rest/agile/1.0/board/${board.id}/sprint?state=active,future`);
          for (const sp of sprintRes.data.values || []) {
            let dbSp = null;
            if (dbBoard?.id) {
              try {
                dbSp = await this.prisma.sprint.upsert({
                  where: { jiraId: String(sp.id) },
                  update: {
                    name: sp.name,
                    state: sp.state,
                    startDate: sp.startDate ? new Date(sp.startDate) : null,
                    endDate: sp.endDate ? new Date(sp.endDate) : null,
                    completeDate: sp.completeDate ? new Date(sp.completeDate) : null,
                    goal: sp.goal,
                    boardId: dbBoard.id,
                  },
                  create: {
                    jiraId: String(sp.id),
                    name: sp.name,
                    state: sp.state,
                    startDate: sp.startDate ? new Date(sp.startDate) : null,
                    endDate: sp.endDate ? new Date(sp.endDate) : null,
                    completeDate: sp.completeDate ? new Date(sp.completeDate) : null,
                    goal: sp.goal,
                    boardId: dbBoard.id,
                  },
                });
              } catch (e: any) {}
            }
            if (sp.state === 'active') {
              activeSprint = dbSp || { id: String(sp.id), name: sp.name, state: sp.state, goal: sp.goal };
            }
          }
        }
      } catch (agileErr: any) {
        this.logger.warn(`Agile board fetch info notice: ${agileErr.message}`);
      }

      // Search all issues in Project using new /rest/api/3/search/jql API endpoint
      const jql = `project = "${conn.projectKey}" ORDER BY updated DESC`;
      let issuesList: any[] = [];
      try {
        const searchRes = await client.post('/rest/api/3/search/jql', {
          jql,
          maxResults: 50,
          fields: ['*all'],
        });
        issuesList = searchRes.data.issues || [];
      } catch (searchErr: any) {
        this.logger.warn(`POST /rest/api/3/search/jql failed, trying GET fallback: ${searchErr.message}`);
        try {
          const searchRes = await client.get(`/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50`);
          issuesList = searchRes.data.issues || [];
        } catch (fallbackErr: any) {
          this.logger.error(`Jira search endpoint failed: ${fallbackErr.message}`);
          syncErrors.push(`Search issues error: ${fallbackErr.message}`);
        }
      }

      for (let idx = 0; idx < issuesList.length; idx++) {
        const issue = issuesList[idx];
        const isPriority = idx < 5 || TARGET_PRIORITY_ISSUES.includes(issue.key);
        await this.storeParsedJiraIssue(client, issue, dbProject?.id, isPriority);
      }
    } catch (e: any) {
      this.logger.warn(`Board/Sprint search warning: ${e.message}`);
    }

    // Save active sprint and last sync time to JSON store
    const storeData = this.readDataFromFile();
    storeData.activeSprint = activeSprint;
    storeData.lastSyncAt = new Date().toISOString();
    this.writeDataToFile(storeData);

    // Update connection status in DB (if online) and file
    const newStatus = syncErrors.length === 0 ? 'CONNECTED' : 'CONNECTED_WITH_WARNINGS';
    const newErrMsg = syncErrors.length > 0 ? syncErrors.slice(0, 3).join(' | ') : null;

    try {
      await this.prisma.jiraConnection.update({
        where: { id: conn.id },
        data: {
          lastSyncAt: new Date(),
          status: newStatus,
          errorMessage: newErrMsg,
        },
      });
    } catch (dbErr: any) {
      this.logger.warn(`Could not update JiraConnection in Prisma DB: ${dbErr.message}`);
    }

    conn.lastSyncAt = new Date();
    conn.status = newStatus;
    conn.errorMessage = newErrMsg;
    this.inMemoryConnection = conn;
    this.writeConnectionToFile(conn);

    return {
      success: true,
      targetIssues: targetResults,
      activeSprint,
      warnings: syncErrors,
    };
  }

  async fetchAndStoreJiraIssue(
    client: AxiosInstance,
    key: string,
    projectId?: string,
    isPriority = false,
  ) {
    const res = await client.get(
      `/rest/api/3/issue/${key}?expand=changelog,renderedFields,names,schema,operations,editmeta,changelog`,
    );
    return this.storeParsedJiraIssue(client, res.data, projectId, isPriority);
  }

  async storeParsedJiraIssue(
    client: AxiosInstance,
    issueData: any,
    projectId?: string,
    isPriority = false,
  ) {
    const fields = issueData.fields || {};
    const jiraId = String(issueData.id);
    const key = issueData.key;

    // Extract story points
    let storyPoints: number | null = null;
    for (const k of Object.keys(fields)) {
      if (k.startsWith('customfield_') && typeof fields[k] === 'number') {
        storyPoints = fields[k];
        break;
      }
    }

    // Extract labels and components
    const labels = fields.labels || [];
    const components = (fields.components || []).map((c: any) => c.name);

    // Extract linked issue keys
    const linkedIssueKeys: string[] = [];
    if (fields.issuelinks) {
      for (const link of fields.issuelinks) {
        if (link.outwardIssue) linkedIssueKeys.push(link.outwardIssue.key);
        if (link.inwardIssue) linkedIssueKeys.push(link.inwardIssue.key);
      }
    }

    // Parse description text
    let descriptionText = '';
    if (typeof fields.description === 'string') {
      descriptionText = fields.description;
    } else if (fields.description?.content) {
      descriptionText = this.parseAdfToText(fields.description);
    }

    const canonicalStatus = fields.status ? this.mapStatusToCanonical(fields.status.name) : CanonicalStatus.TODO;

    const issueObj: any = {
      id: jiraId || key,
      jiraId,
      key,
      summary: fields.summary || 'No Summary',
      description: descriptionText,
      issueType: fields.issuetype?.name || 'Task',
      priority: fields.priority?.name || 'Medium',
      storyPoints,
      originalEstimateSec: fields.timeoriginalestimate || null,
      timeSpentSec: fields.timespent || 0,
      dueDate: fields.duedate ? new Date(fields.duedate) : null,
      resolution: fields.resolution?.name || null,
      resolvedAt: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
      isMonitoredPriority: isPriority || TARGET_PRIORITY_ISSUES.includes(key),
      labels,
      components,
      linkedIssueKeys,
      canonicalStatus,
      status: fields.status ? { name: fields.status.name, canonicalStatus } : { name: 'To Do', canonicalStatus },
      assigneeName: fields.assignee?.displayName,
      assigneeEmail: fields.assignee?.emailAddress,
      assigneeAvatarUrl: fields.assignee?.avatarUrls?.['48x48'],
      reporterName: fields.reporter?.displayName,
      lastJiraActivityAt: fields.updated ? new Date(fields.updated) : new Date(),
      lastMeaningfulActivityAt: fields.updated ? new Date(fields.updated) : new Date(),
      createdAt: fields.created ? new Date(fields.created) : new Date(),
      updatedAt: fields.updated ? new Date(fields.updated) : new Date(),
      riskScores: [],
      comments: (fields.comment?.comments || []).map((c: any) => ({
        id: String(c.id),
        body: typeof c.body === 'string' ? c.body : this.parseAdfToText(c.body),
        author: c.author?.displayName || 'Unknown',
        timestamp: c.created ? new Date(c.created) : new Date(),
      })),
      worklogs: [],
      gitCommits: [],
      pullRequests: [],
      qaValidations: [],
      uatValidations: [],
    };

    // Save to JSON store
    try {
      const storeData = this.readDataFromFile();
      const existingIdx = storeData.issues.findIndex((i: any) => i.key === key);
      if (existingIdx >= 0) {
        storeData.issues[existingIdx] = { ...storeData.issues[existingIdx], ...issueObj };
      } else {
        storeData.issues.push(issueObj);
      }
      this.writeDataToFile(storeData);
    } catch (fileErr: any) {
      this.logger.warn(`Could not save issue ${key} to JSON file store: ${fileErr.message}`);
    }

    // Try saving to Prisma DB if online
    try {
      let statusRecord = null;
      if (fields.status) {
        statusRecord = await this.prisma.issueStatus.upsert({
          where: { jiraId: String(fields.status.id) },
          update: { name: fields.status.name, colorCategory: fields.status.statusCategory?.colorName },
          create: {
            jiraId: String(fields.status.id),
            name: fields.status.name,
            canonicalStatus,
            colorCategory: fields.status.statusCategory?.colorName,
          },
        });
      }

      let assigneeUser = null;
      if (fields.assignee) {
        assigneeUser = await this.prisma.user.upsert({
          where: { email: fields.assignee.emailAddress || `${fields.assignee.accountId}@jira.local` },
          update: { name: fields.assignee.displayName, jiraAccountId: fields.assignee.accountId, avatarUrl: fields.assignee.avatarUrls?.['48x48'] },
          create: {
            email: fields.assignee.emailAddress || `${fields.assignee.accountId}@jira.local`,
            name: fields.assignee.displayName,
            jiraAccountId: fields.assignee.accountId,
            avatarUrl: fields.assignee.avatarUrls?.['48x48'],
            passwordHash: 'jira-managed-account',
          },
        });
      }

      let reporterUser = null;
      if (fields.reporter) {
        reporterUser = await this.prisma.user.upsert({
          where: { email: fields.reporter.emailAddress || `${fields.reporter.accountId}@jira.local` },
          update: { name: fields.reporter.displayName, jiraAccountId: fields.reporter.accountId },
          create: {
            email: fields.reporter.emailAddress || `${fields.reporter.accountId}@jira.local`,
            name: fields.reporter.displayName,
            jiraAccountId: fields.reporter.accountId,
            passwordHash: 'jira-managed-account',
          },
        });
      }

      let sprintId = null;
      if (fields.sprint) {
        const sp = await this.prisma.sprint.upsert({
          where: { jiraId: String(fields.sprint.id) },
          update: { name: fields.sprint.name, state: fields.sprint.state, startDate: fields.sprint.startDate ? new Date(fields.sprint.startDate) : null, endDate: fields.sprint.endDate ? new Date(fields.sprint.endDate) : null },
          create: { jiraId: String(fields.sprint.id), name: fields.sprint.name, state: fields.sprint.state, startDate: fields.sprint.startDate ? new Date(fields.sprint.startDate) : null, endDate: fields.sprint.endDate ? new Date(fields.sprint.endDate) : null },
        });
        sprintId = sp.id;
      }

      const issue = await this.prisma.issue.upsert({
        where: { key },
        update: {
          jiraId,
          summary: fields.summary || 'No Summary',
          description: descriptionText,
          issueType: fields.issuetype?.name || 'Task',
          priority: fields.priority?.name || 'Medium',
          storyPoints,
          originalEstimateSec: fields.timeoriginalestimate || null,
          timeSpentSec: fields.timespent || 0,
          dueDate: fields.duedate ? new Date(fields.duedate) : null,
          resolution: fields.resolution?.name || null,
          resolvedAt: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
          isMonitoredPriority: isPriority || TARGET_PRIORITY_ISSUES.includes(key),
          labels,
          components,
          linkedIssueKeys,
          canonicalStatus,
          statusId: statusRecord?.id,
          projectId,
          sprintId,
          assigneeId: assigneeUser?.id,
          assigneeName: fields.assignee?.displayName,
          assigneeEmail: fields.assignee?.emailAddress,
          assigneeAvatarUrl: fields.assignee?.avatarUrls?.['48x48'],
          reporterId: reporterUser?.id,
          reporterName: fields.reporter?.displayName,
        },
        create: {
          jiraId,
          key,
          summary: fields.summary || 'No Summary',
          description: descriptionText,
          issueType: fields.issuetype?.name || 'Task',
          priority: fields.priority?.name || 'Medium',
          storyPoints,
          originalEstimateSec: fields.timeoriginalestimate || null,
          timeSpentSec: fields.timespent || 0,
          dueDate: fields.duedate ? new Date(fields.duedate) : null,
          resolution: fields.resolution?.name || null,
          resolvedAt: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
          isMonitoredPriority: isPriority || TARGET_PRIORITY_ISSUES.includes(key),
          labels,
          components,
          linkedIssueKeys,
          canonicalStatus,
          statusId: statusRecord?.id,
          projectId,
          sprintId,
          assigneeId: assigneeUser?.id,
          assigneeName: fields.assignee?.displayName,
          assigneeEmail: fields.assignee?.emailAddress,
          assigneeAvatarUrl: fields.assignee?.avatarUrls?.['48x48'],
          reporterId: reporterUser?.id,
          reporterName: fields.reporter?.displayName,
        },
      });

      return issue;
    } catch (dbErr: any) {
      this.logger.warn(`Prisma DB save error for ${key} (DB offline): ${dbErr.message}`);
    }

    return issueObj;
  }

  parseAdfToText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    let text = '';
    if (node.type === 'text') {
      return node.text || '';
    }
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        text += this.parseAdfToText(child);
        if (child.type === 'paragraph') text += '\n';
      }
    }
    return text.trim();
  }
}
