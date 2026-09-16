import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { GitService } from './git.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('git')
export class GitController {
  constructor(
    private readonly gitService: GitService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('commits')
  async getCommits(@Query('issueKey') issueKey?: string) {
    const where: any = {};
    if (issueKey) {
      const issue = await this.prisma.issue.findUnique({
        where: { key: issueKey.toUpperCase() },
      });
      if (issue) where.issueId = issue.id;
    }
    return this.prisma.gitCommit.findMany({
      where,
      include: {
        issue: {
          select: { key: true, summary: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  @Get('pull-requests')
  async getPullRequests(@Query('issueKey') issueKey?: string) {
    const where: any = {};
    if (issueKey) {
      const issue = await this.prisma.issue.findUnique({
        where: { key: issueKey.toUpperCase() },
      });
      if (issue) where.issueId = issue.id;
    }
    return this.prisma.pullRequest.findMany({
      where,
      include: {
        reviews: true,
        issue: {
          select: { key: true, summary: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Post('manual-commit')
  recordManualCommit(@Body() body: any) {
    return this.gitService.recordCommit({
      hash: body.hash,
      message: body.message,
      authorName: body.authorName,
      authorEmail: body.authorEmail,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      url: body.url,
      branch: body.branch,
      repoName: body.repoName,
    });
  }
}
