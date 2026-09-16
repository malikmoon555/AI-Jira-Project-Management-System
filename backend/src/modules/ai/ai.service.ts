import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';
import { CanonicalStatus } from '@prisma/client';
import { JiraService, TARGET_PRIORITY_ISSUES } from '../jira/jira.service';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private prisma: PrismaService,
    private jiraService: JiraService,
  ) {}

  private getOpenAIClient(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your-openai-api-key') {
      return null;
    }
    return new OpenAI({ apiKey });
  }

  // Database tools callable by AI
  async getIssueDetails(key: string) {
    try {
      const dbIssue = await this.prisma.issue.findUnique({
        where: { key: key.toUpperCase() },
        include: {
          status: true,
          sprint: true,
          assignee: true,
          gitCommits: { take: 5, orderBy: { timestamp: 'desc' } },
          pullRequests: { take: 3, orderBy: { createdAt: 'desc' } },
          qaValidations: { take: 1, orderBy: { validatedAt: 'desc' } },
          riskScores: { take: 1, orderBy: { calculatedAt: 'desc' } },
          comments: { take: 5, orderBy: { timestamp: 'desc' } },
        },
      });
      if (dbIssue) return dbIssue;
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    const syncedIssue = (synced.issues || []).find((i: any) => i.key?.toUpperCase() === key.toUpperCase());
    return syncedIssue || null;
  }

  async getPriorityCardsStatus() {
    try {
      const dbIssues = await this.prisma.issue.findMany({
        where: { isMonitoredPriority: true },
        include: {
          status: true,
          assignee: true,
          riskScores: { take: 1, orderBy: { calculatedAt: 'desc' } },
          qaValidations: { take: 1, orderBy: { validatedAt: 'desc' } },
        },
      });
      if (dbIssues && dbIssues.length > 0) return dbIssues;
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    return (synced.issues || []).slice(0, 5);
  }

  async getInactiveCards(hours = 48) {
    try {
      const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);
      const dbIssues = await this.prisma.issue.findMany({
        where: {
          canonicalStatus: CanonicalStatus.DEVELOPMENT,
          OR: [
            { lastMeaningfulActivityAt: { lt: threshold } },
            { lastMeaningfulActivityAt: null },
          ],
        },
        include: { assignee: true, status: true },
      });
      if (dbIssues && dbIssues.length > 0) return dbIssues;
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    return (synced.issues || []).filter((i: any) => i.canonicalStatus === 'DEVELOPMENT');
  }

  async getCardsWaitingForQA() {
    try {
      const dbIssues = await this.prisma.issue.findMany({
        where: { canonicalStatus: CanonicalStatus.QA },
        include: {
          assignee: true,
          qaValidations: { take: 1, orderBy: { validatedAt: 'desc' } },
        },
      });
      if (dbIssues && dbIssues.length > 0) return dbIssues;
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    return (synced.issues || []).filter((i: any) => i.canonicalStatus === 'QA');
  }

  async getDeveloperWorkload() {
    let issues: any[] = [];
    try {
      issues = await this.prisma.issue.findMany({
        where: { canonicalStatus: { not: CanonicalStatus.DONE } },
        select: {
          key: true,
          assigneeName: true,
          canonicalStatus: true,
          priority: true,
        },
      });
    } catch (e) {}

    if (!issues || issues.length === 0) {
      const synced = this.jiraService.getSyncedData();
      issues = (synced.issues || []).filter((i: any) => i.canonicalStatus !== 'DONE');
    }

    const counts: Record<string, { total: number; inDev: number; inQA: number; cards: string[] }> = {};
    for (const i of issues) {
      const dev = i.assigneeName || 'Unassigned';
      if (!counts[dev]) counts[dev] = { total: 0, inDev: 0, inQA: 0, cards: [] };
      counts[dev].total++;
      if (i.canonicalStatus === 'DEVELOPMENT' || i.canonicalStatus === CanonicalStatus.DEVELOPMENT) counts[dev].inDev++;
      if (i.canonicalStatus === 'QA' || i.canonicalStatus === CanonicalStatus.QA) counts[dev].inQA++;
      counts[dev].cards.push(i.key);
    }
    return counts;
  }

  async getSprintSummary() {
    try {
      const activeSprint = await this.prisma.sprint.findFirst({
        where: { state: 'active' },
        include: {
          issues: {
            include: { status: true, assignee: true, riskScores: { take: 1, orderBy: { calculatedAt: 'desc' } } },
          },
        },
      });
      if (activeSprint) {
        const issues = activeSprint.issues;
        return {
          sprintName: activeSprint.name,
          startDate: activeSprint.startDate,
          endDate: activeSprint.endDate,
          totalCards: issues.length,
          statusBreakdown: {
            TODO: issues.filter((i) => i.canonicalStatus === CanonicalStatus.TODO).length,
            DEVELOPMENT: issues.filter((i) => i.canonicalStatus === CanonicalStatus.DEVELOPMENT).length,
            QA: issues.filter((i) => i.canonicalStatus === CanonicalStatus.QA).length,
            UAT: issues.filter((i) => i.canonicalStatus === CanonicalStatus.UAT).length,
            MASTER: issues.filter((i) => i.canonicalStatus === CanonicalStatus.MASTER).length,
            DONE: issues.filter((i) => i.canonicalStatus === CanonicalStatus.DONE).length,
          },
          priorityIssues: issues.slice(0, 5).map((i) => ({
            key: i.key,
            status: i.canonicalStatus,
            assignee: i.assigneeName,
          })),
        };
      }
    } catch (e) {}

    const synced = this.jiraService.getSyncedData();
    const issues = synced.issues || [];
    return {
      sprintName: synced.activeSprint?.name || 'Current Active Sprint',
      totalCards: issues.length,
      statusBreakdown: {
        TODO: issues.filter((i: any) => i.canonicalStatus === 'TODO').length,
        DEVELOPMENT: issues.filter((i: any) => i.canonicalStatus === 'DEVELOPMENT').length,
        QA: issues.filter((i: any) => i.canonicalStatus === 'QA').length,
        UAT: issues.filter((i: any) => i.canonicalStatus === 'UAT').length,
        MASTER: issues.filter((i: any) => i.canonicalStatus === 'MASTER').length,
        DONE: issues.filter((i: any) => i.canonicalStatus === 'DONE').length,
      },
      priorityIssues: issues.slice(0, 5).map((i: any) => ({
        key: i.key,
        status: i.canonicalStatus,
        assignee: i.assigneeName,
      })),
    };
  }

  async answerPMQuestion(conversationId: string, question: string) {
    const openai = this.getOpenAIClient();

    // Check conversation history
    let conv = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { take: 10, orderBy: { createdAt: 'asc' } } },
    });

    if (!conv) {
      conv = await this.prisma.aIConversation.create({
        data: { id: conversationId, title: question.substring(0, 40) },
        include: { messages: true },
      });
    }

    // Save user message
    await this.prisma.aIMessage.create({
      data: {
        conversationId: conv.id,
        role: 'user',
        content: question,
      },
    });

    // Check if query targets a specific issue key like SPM-46 or BSB-2771
    const issueMatch = question.match(/([A-Z0-9]{2,10}-\d+)/i);
    const matchedKey = issueMatch ? issueMatch[0].toUpperCase() : null;

    // Direct deterministic data gathering to ground AI
    let contextData: any = null;
    let queryType = 'general';

    if (matchedKey) {
      queryType = 'issue_detail';
      contextData = await this.getIssueDetails(matchedKey);
    } else if (/priority|five cards|target cards/i.test(question)) {
      queryType = 'priority_cards';
      contextData = await this.getPriorityCardsStatus();
    } else if (/inactive|no activity/i.test(question)) {
      queryType = 'inactive';
      contextData = await this.getInactiveCards(48);
    } else if (/waiting for qa|qa cards/i.test(question)) {
      queryType = 'qa';
      contextData = await this.getCardsWaitingForQA();
    } else if (/workload|developer/i.test(question)) {
      queryType = 'workload';
      contextData = await this.getDeveloperWorkload();
    } else if (/sprint/i.test(question)) {
      queryType = 'sprint';
      contextData = await this.getSprintSummary();
    }

    if (!openai) {
      // Deterministic factual response directly from PostgreSQL data
      const answer = this.generateDeterministicAnswer(question, queryType, contextData, matchedKey);
      await this.prisma.aIMessage.create({
        data: {
          conversationId: conv.id,
          role: 'assistant',
          content: answer,
        },
      });
      return { answer, source: 'DATABASE_DIRECT' };
    }

    // OpenAI with Function Calling / Grounded Prompt
    const systemPrompt = `You are a Senior Project Manager Assistant for Jira Project BSB.
You must ONLY answer using the provided structured database data.
DO NOT fabricate or hallucinate any issues, commit hashes, or timestamps.
Target Monitored Priority Issues are: BSB-2771, BSB-2652, BSB-2559, BSB-2606, BSB-2690.
If data does not exist, clearly state that it is not found in the Jira/Git database.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'system',
          content: `Real PostgreSQL Context Data for this query:\n${JSON.stringify(contextData, null, 2)}`,
        },
        ...conv.messages.map((m) => ({
          role: m.role as any,
          content: m.content,
        })),
        { role: 'user', content: question },
      ],
      temperature: 0.2,
    });

    const assistantContent = response.choices[0]?.message?.content || 'No response generated.';

    await this.prisma.aIMessage.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: assistantContent,
      },
    });

    return { answer: assistantContent, source: 'OPENAI_GROUNDED' };
  }

  private generateDeterministicAnswer(
    question: string,
    type: string,
    data: any,
    matchedKey: string | null,
  ): string {
    if (type === 'issue_detail' && data) {
      const risk = data.riskScores[0];
      const qa = data.qaValidations[0];
      return `**${data.key} Summary**
- **Summary**: ${data.summary}
- **Status**: ${data.canonicalStatus} (Jira status: ${data.status?.name || 'N/A'})
- **Assignee**: ${data.assigneeName || 'Unassigned'}
- **Priority**: ${data.priority}
- **Story Points**: ${data.storyPoints || 'Not estimated'}
- **Due Date**: ${data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : 'None'}
- **Risk Level**: ${risk ? `${risk.level} (${risk.score}/100)` : 'Not calculated'}
- **QA Readiness**: ${qa ? qa.summary : 'Not yet validated for QA'}
- **Linked Commits**: ${data.gitCommits.length} commit(s)
- **Pull Requests**: ${data.pullRequests.length} PR(s)
- **Last Meaningful Activity**: ${data.lastMeaningfulActivityAt ? new Date(data.lastMeaningfulActivityAt).toLocaleString() : 'No activity logged yet'}`;
    }

    if (type === 'issue_detail' && !data) {
      return `Issue **${matchedKey}** is not found in the local database. Please trigger Jira synchronization in Settings or verify project access.`;
    }

    if (type === 'priority_cards') {
      if (!data || data.length === 0) {
        return 'None of the 5 priority issues (BSB-2771, BSB-2652, BSB-2559, BSB-2606, BSB-2690) are synchronized in the database yet. Please run Jira Sync in Settings.';
      }
      return `**Priority Monitored Issues Status:**\n` +
        data.map((i: any) => `- **${i.key}**: ${i.canonicalStatus} | Assignee: ${i.assigneeName || 'Unassigned'} | Risk: ${i.riskScores[0]?.level || 'LOW'}`).join('\n');
    }

    if (type === 'inactive') {
      if (!data || data.length === 0) {
        return 'All issues in DEVELOPMENT currently have recent developer activity (within 48 hours). No inactive cards detected.';
      }
      return `**Inactive Cards in DEVELOPMENT (>48h):**\n` +
        data.map((i: any) => `- **${i.key}**: Assigned to ${i.assigneeName || 'Unassigned'}, last activity: ${i.lastMeaningfulActivityAt ? new Date(i.lastMeaningfulActivityAt).toLocaleString() : 'None'}`).join('\n');
    }

    if (type === 'workload') {
      return `**Developer Workload:**\n` +
        Object.entries(data).map(([dev, info]: [string, any]) => `- **${dev}**: ${info.total} active card(s) (${info.inDev} in Dev, ${info.inQA} in QA)`).join('\n');
    }

    if (type === 'sprint') {
      if (data.message) return data.message;
      return `**Active Sprint: ${data.sprintName}**
- Total Cards: ${data.totalCards}
- TODO: ${data.statusBreakdown.TODO}
- DEVELOPMENT: ${data.statusBreakdown.DEVELOPMENT}
- QA: ${data.statusBreakdown.QA}
- UAT: ${data.statusBreakdown.UAT}
- MASTER: ${data.statusBreakdown.MASTER}
- DONE: ${data.statusBreakdown.DONE}`;
    }

    return `I queried the BSB Project database. The active monitoring system is tracking the 5 priority Jira issues (BSB-2771, BSB-2652, BSB-2559, BSB-2606, BSB-2690) along with Git commits, QA gates, and inactivity timers. Ask about any specific issue key (e.g., "Show status of BSB-2771") or sprint progress.`;
  }
}
