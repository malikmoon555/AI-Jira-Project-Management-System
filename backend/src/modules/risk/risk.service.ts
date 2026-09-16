import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CanonicalStatus, RiskLevel, GateResult } from '@prisma/client';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(private prisma: PrismaService) {}

  async calculateRiskForIssue(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        gitCommits: true,
        pullRequests: true,
        qaValidations: {
          orderBy: { validatedAt: 'desc' },
          take: 1,
        },
        uatValidations: {
          orderBy: { validatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!issue) return null;

    let score = 0;
    const factors: { factor: string; points: number; description: string }[] = [];
    const now = new Date();

    // 1. Inactivity Factor (up to 30 pts)
    if (issue.canonicalStatus === CanonicalStatus.DEVELOPMENT) {
      const lastAct = issue.lastMeaningfulActivityAt || issue.updatedAt;
      const hours = Math.floor((now.getTime() - lastAct.getTime()) / (1000 * 60 * 60));
      if (hours >= 72) {
        score += 30;
        factors.push({
          factor: 'INACTIVITY_72H',
          points: 30,
          description: `No meaningful activity for ${hours} hours in DEVELOPMENT (>72h).`,
        });
      } else if (hours >= 48) {
        score += 20;
        factors.push({
          factor: 'INACTIVITY_48H',
          points: 20,
          description: `No meaningful activity for ${hours} hours in DEVELOPMENT (>48h).`,
        });
      } else if (hours >= 24) {
        score += 10;
        factors.push({
          factor: 'INACTIVITY_24H',
          points: 10,
          description: `No activity for ${hours} hours in DEVELOPMENT (>24h).`,
        });
      }
    }

    // 2. Priority Factor (up to 20 pts)
    const prio = (issue.priority || '').toLowerCase();
    if (prio.includes('highest') || prio.includes('blocker')) {
      score += 20;
      factors.push({
        factor: 'PRIORITY_HIGHEST',
        points: 20,
        description: `Highest/Blocker priority level in Jira.`,
      });
    } else if (prio.includes('high') || prio.includes('critical')) {
      score += 15;
      factors.push({
        factor: 'PRIORITY_HIGH',
        points: 15,
        description: `High/Critical priority level in Jira.`,
      });
    }

    // 3. Due Date Factor (up to 20 pts)
    if (issue.dueDate && issue.canonicalStatus !== CanonicalStatus.DONE) {
      if (issue.dueDate < now) {
        score += 20;
        factors.push({
          factor: 'OVERDUE',
          points: 20,
          description: `Due date (${issue.dueDate.toISOString().split('T')[0]}) has passed.`,
        });
      } else {
        const hoursToDue = Math.floor((issue.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        if (hoursToDue <= 24) {
          score += 12;
          factors.push({
            factor: 'DUE_SOON_24H',
            points: 12,
            description: `Due within 24 hours (${hoursToDue}h remaining).`,
          });
        } else if (hoursToDue <= 48) {
          score += 6;
          factors.push({
            factor: 'DUE_SOON_48H',
            points: 6,
            description: `Due within 48 hours (${hoursToDue}h remaining).`,
          });
        }
      }
    }

    // 4. Blocked State (up to 25 pts)
    const isBlocked =
      issue.summary.toLowerCase().includes('block') ||
      issue.labels.some((l) => l.toLowerCase().includes('block'));
    if (isBlocked) {
      score += 25;
      factors.push({
        factor: 'BLOCKED_STATE',
        points: 25,
        description: `Issue explicitly flagged or labeled as blocked.`,
      });
    }

    // 5. QA Gate Failure (up to 20 pts)
    if (issue.qaValidations[0] && issue.qaValidations[0].overallResult === GateResult.FAIL) {
      score += 20;
      factors.push({
        factor: 'QA_GATE_FAIL',
        points: 20,
        description: `Failed QA Gate verification (${issue.qaValidations[0].summary}).`,
      });
    }

    // 6. UAT Blocked (up to 20 pts)
    if (issue.uatValidations[0] && issue.uatValidations[0].overallResult === GateResult.FAIL) {
      score += 20;
      factors.push({
        factor: 'UAT_GATE_FAIL',
        points: 20,
        description: `UAT is blocked (${issue.uatValidations[0].summary}).`,
      });
    }

    // 7. Missing Git Commits in Development (up to 15 pts)
    if (issue.canonicalStatus === CanonicalStatus.DEVELOPMENT && issue.gitCommits.length === 0) {
      score += 15;
      factors.push({
        factor: 'MISSING_COMMITS',
        points: 15,
        description: `Card is in DEVELOPMENT but has zero linked Git commits.`,
      });
    }

    // Cap at 100
    const finalScore = Math.min(score, 100);

    let level: RiskLevel = RiskLevel.LOW;
    if (finalScore >= 75) level = RiskLevel.CRITICAL;
    else if (finalScore >= 50) level = RiskLevel.HIGH;
    else if (finalScore >= 25) level = RiskLevel.MEDIUM;

    return this.prisma.riskScore.create({
      data: {
        issueId: issue.id,
        score: finalScore,
        level,
        factors: factors as any,
        calculatedAt: now,
      },
    });
  }

  async recalculateAllRisks() {
    this.logger.log('Recalculating risk scores for all active issues...');
    const activeIssues = await this.prisma.issue.findMany({
      where: {
        canonicalStatus: { not: CanonicalStatus.DONE },
      },
      select: { id: true, key: true },
    });

    const results = [];
    for (const issue of activeIssues) {
      const risk = await this.calculateRiskForIssue(issue.id);
      results.push({ key: issue.key, risk });
    }
    return results;
  }
}
