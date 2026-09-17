import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GateResult } from '@prisma/client';

@Injectable()
export class UATService {
  private readonly logger = new Logger(UATService.name);

  constructor(private prisma: PrismaService) {}

  async evaluateIssue(issueKey: string) {
    let issue: any = null;
    try {
      issue = await this.prisma.issue.findUnique({
        where: { key: issueKey.toUpperCase() },
        include: {
          qaValidations: {
            orderBy: { validatedAt: 'desc' },
            take: 1,
          },
          attachments: true,
          comments: true,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Prisma findUnique deferred in UATService for ${issueKey}: ${e.message}`);
    }

    if (!issue) {
      return {
        issueId: issueKey,
        overallResult: GateResult.NOT_AVAILABLE,
        summary: `Issue ${issueKey} not found in database. Please run Jira Sync.`,
        validatedAt: new Date(),
      };
    }

    const failedReasons: string[] = [];

    // 1. QA completed
    const latestQA = (issue.qaValidations || [])[0];
    const hasQACompleted = latestQA && latestQA.overallResult === GateResult.PASS;
    const qaCompletedResult = hasQACompleted ? GateResult.PASS : GateResult.FAIL;
    if (!hasQACompleted) failedReasons.push('QA Gate not passed or not verified');

    // 2. Test evidence
    const hasEvidence =
      (issue.attachments || []).length > 0 ||
      (issue.comments || []).some((c: any) => /test\s*(result|evidence|report|passed|screenshot)/i.test(c.body));
    const testEvidenceResult = hasEvidence ? GateResult.PASS : GateResult.FAIL;
    if (!hasEvidence) failedReasons.push('Missing QA test evidence');

    // 3. Bugs resolved (check comments/linked issues for open blockers)
    const hasOpenBugs = (issue.comments || []).some((c: any) => /bug\s*(reopened|failed|blocking)/i.test(c.body));
    const bugsResolvedResult = !hasOpenBugs ? GateResult.PASS : GateResult.FAIL;
    if (hasOpenBugs) failedReasons.push('Unresolved bugs or regression found in comments');

    // 4. QA comment
    const hasQAComment = (issue.comments || []).some((c: any) => /(qa\s*signoff|verified\s*by\s*qa|ready\s*for\s*uat)/i.test(c.body));
    const qaCommentResult = hasQAComment ? GateResult.PASS : GateResult.FAIL;
    if (!hasQAComment) failedReasons.push('Missing QA sign-off comment');

    // 5. Acceptance criteria
    const acRegex = /(acceptance\s*criteria|ac\s*:|given\s+when\s+then)/i;
    const hasAC = acRegex.test(issue.description || '');
    const acResult = hasAC ? GateResult.PASS : GateResult.FAIL;
    if (!hasAC) failedReasons.push('Acceptance criteria missing from card');

    // 6. Required attachments
    const attachmentsResult = (issue.attachments || []).length > 0 ? GateResult.PASS : GateResult.FAIL;
    if ((issue.attachments || []).length === 0) failedReasons.push('No attachments found for UAT inspection');

    const overallResult: GateResult = failedReasons.length === 0 ? GateResult.PASS : GateResult.FAIL;
    const summary =
      overallResult === GateResult.PASS
        ? 'UAT READY: All QA and acceptance criteria validated.'
        : `UAT BLOCKED: ${failedReasons.length} requirement(s) failed (${failedReasons.join(', ')}).`;

    const valObj = {
      issueId: issue.id,
      qaCompletedResult,
      testEvidenceResult,
      bugsResolvedResult,
      qaCommentResult,
      acResult,
      attachmentsResult,
      overallResult,
      summary,
      validatedAt: new Date(),
    };

    try {
      return await this.prisma.uATValidation.create({ data: valObj });
    } catch (e: any) {
      this.logger.warn(`Could not save UATValidation to DB: ${e.message}`);
    }

    return valObj;
  }

  async getValidations(issueKey?: string) {
    try {
      const where: any = {};
      if (issueKey) {
        const issue = await this.prisma.issue.findUnique({
          where: { key: issueKey.toUpperCase() },
        });
        if (issue) where.issueId = issue.id;
      }
      return await this.prisma.uATValidation.findMany({
        where,
        include: {
          issue: {
            select: {
              key: true,
              summary: true,
              canonicalStatus: true,
              assigneeName: true,
              isMonitoredPriority: true,
            },
          },
        },
        orderBy: { validatedAt: 'desc' },
        take: 50,
      });
    } catch (e: any) {
      return [];
    }
  }
}
