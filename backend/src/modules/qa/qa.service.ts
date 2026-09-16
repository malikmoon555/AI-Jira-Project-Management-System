import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GateResult } from '@prisma/client';

@Injectable()
export class QAService {
  private readonly logger = new Logger(QAService.name);

  constructor(private prisma: PrismaService) {}

  async evaluateIssue(issueKey: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { key: issueKey.toUpperCase() },
      include: {
        gitCommits: true,
        pullRequests: {
          include: { reviews: true },
        },
        attachments: true,
        comments: true,
      },
    });

    if (!issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    const failedReasons: string[] = [];

    // 1. Git commit exists
    const hasCommits = issue.gitCommits.length > 0;
    const gitCommitResult: GateResult = hasCommits ? GateResult.PASS : GateResult.FAIL;
    const gitCommitDetail = hasCommits
      ? `Found ${issue.gitCommits.length} linked Git commit(s) (latest: ${issue.gitCommits[0].shortHash})`
      : 'FAIL: No Git commits referencing this issue key were found.';
    if (!hasCommits) failedReasons.push('No Git commits linked');

    // 2. Pull request exists
    const hasPR = issue.pullRequests.length > 0;
    const pullRequestResult: GateResult = hasPR ? GateResult.PASS : GateResult.FAIL;
    const pullRequestDetail = hasPR
      ? `Found PR #${issue.pullRequests[0].prNumber} [${issue.pullRequests[0].status}]`
      : 'FAIL: No Pull Request found associated with this issue.';
    if (!hasPR) failedReasons.push('No Pull Request associated');

    // 3. Code review completed
    let hasApprovedReview = false;
    if (hasPR) {
      const allReviews = issue.pullRequests.flatMap((p) => p.reviews);
      hasApprovedReview = allReviews.some((r) => r.state === 'APPROVED');
    }
    const codeReviewResult: GateResult = hasApprovedReview ? GateResult.PASS : GateResult.FAIL;
    const codeReviewDetail = hasApprovedReview
      ? 'Code review completed and APPROVED by reviewer'
      : 'FAIL: No approved code review found on associated Pull Request(s).';
    if (!hasApprovedReview) failedReasons.push('Code review not completed/approved');

    // 4. Unit test exists / evidence attached
    const unitTestRegex = /(unit\s*test|test\s*result|test\s*coverage|jest|pytest|spec)/i;
    const hasUnitTestAttachment = issue.attachments.some((a) => unitTestRegex.test(a.filename));
    const hasUnitTestComment = issue.comments.some((c) => unitTestRegex.test(c.body));
    const hasUnitTestCommit = issue.gitCommits.some((c) => unitTestRegex.test(c.message));
    const hasUnitTest = hasUnitTestAttachment || hasUnitTestComment || hasUnitTestCommit;

    const unitTestResult: GateResult = hasUnitTest ? GateResult.PASS : GateResult.FAIL;
    const unitTestDetail = hasUnitTest
      ? 'Unit test evidence verified from repository commits/attachments/comments'
      : 'FAIL: No unit test evidence, spec files, or test results found in Jira or Git.';
    if (!hasUnitTest) failedReasons.push('Missing unit test evidence');

    // 5. Test case exists
    const testCaseRegex = /(test\s*case|qa\s*scenario|test\s*plan|tc-\d+|qase)/i;
    const hasTestCase =
      testCaseRegex.test(issue.description || '') ||
      issue.comments.some((c) => testCaseRegex.test(c.body)) ||
      issue.attachments.some((a) => testCaseRegex.test(a.filename));

    const testCaseResult: GateResult = hasTestCase ? GateResult.PASS : GateResult.FAIL;
    const testCaseDetail = hasTestCase
      ? 'Test cases/scenarios documented in Jira issue or attachments'
      : 'FAIL: No test case definition or QA test scenarios documented.';
    if (!hasTestCase) failedReasons.push('Test cases not documented');

    // 6. Required documentation exists
    const docRegex = /(doc|confluence|readme|swagger|api\s*spec|architecture)/i;
    const hasDoc =
      docRegex.test(issue.description || '') ||
      issue.attachments.some((a) => docRegex.test(a.filename)) ||
      issue.comments.some((c) => docRegex.test(c.body));

    const documentationResult: GateResult = hasDoc ? GateResult.PASS : GateResult.FAIL;
    const documentationDetail = hasDoc
      ? 'Documentation or API specification found in Jira issue/attachments'
      : 'FAIL: Required documentation or API reference is missing.';
    if (!hasDoc) failedReasons.push('Missing required documentation');

    // 7. Acceptance criteria completed
    const acRegex = /(acceptance\s*criteria|ac\s*:|given\s+when\s+then)/i;
    const hasAC = acRegex.test(issue.description || '');
    const acceptanceCriteriaResult: GateResult = hasAC ? GateResult.PASS : GateResult.FAIL;
    const acceptanceCriteriaDetail = hasAC
      ? 'Acceptance criteria clearly specified on Jira issue'
      : 'FAIL: Acceptance criteria not specified in Jira issue description.';
    if (!hasAC) failedReasons.push('Acceptance criteria not specified');

    // 8. Developer update / comment exists
    const hasDevComment = issue.comments.length > 0;
    const developerUpdateResult: GateResult = hasDevComment ? GateResult.PASS : GateResult.FAIL;
    const developerUpdateDetail = hasDevComment
      ? `Developer update verified (${issue.comments.length} comment(s) logged)`
      : 'FAIL: No developer update or handover comment added in Jira.';
    if (!hasDevComment) failedReasons.push('No developer update comment');

    const overallResult: GateResult = failedReasons.length === 0 ? GateResult.PASS : GateResult.FAIL;
    const summary =
      overallResult === GateResult.PASS
        ? 'READY FOR QA: All 8 QA gate requirements passed verification.'
        : `NOT READY FOR QA: ${failedReasons.length} requirement(s) failed (${failedReasons.join(', ')}).`;

    const validation = await this.prisma.qAValidation.create({
      data: {
        issueId: issue.id,
        gitCommitResult,
        gitCommitDetail,
        pullRequestResult,
        pullRequestDetail,
        codeReviewResult,
        codeReviewDetail,
        unitTestResult,
        unitTestDetail,
        testCaseResult,
        testCaseDetail,
        documentationResult,
        documentationDetail,
        acceptanceCriteriaResult,
        acceptanceCriteriaDetail,
        developerUpdateResult,
        developerUpdateDetail,
        overallResult,
        summary,
      },
    });

    return validation;
  }

  async getValidations(issueKey?: string) {
    const where: any = {};
    if (issueKey) {
      const issue = await this.prisma.issue.findUnique({
        where: { key: issueKey.toUpperCase() },
      });
      if (issue) where.issueId = issue.id;
    }
    return this.prisma.qAValidation.findMany({
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
  }
}
