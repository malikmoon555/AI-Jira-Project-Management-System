import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CanonicalStatus } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async getProject(key = process.env.JIRA_PROJECT_KEY || 'SPM') {
    return this.prisma.jiraProject.findUnique({
      where: { key },
      include: {
        boards: true,
        statuses: {
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  async getAllStatuses() {
    return this.prisma.issueStatus.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateStatusMapping(statusId: string, canonicalStatus: CanonicalStatus) {
    const updated = await this.prisma.issueStatus.update({
      where: { id: statusId },
      data: { canonicalStatus },
    });

    // Update all issues using this status
    await this.prisma.issue.updateMany({
      where: { statusId },
      data: { canonicalStatus },
    });

    return updated;
  }
}
