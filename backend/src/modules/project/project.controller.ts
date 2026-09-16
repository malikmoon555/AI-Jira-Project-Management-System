import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CanonicalStatus } from '@prisma/client';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('active')
  getActiveProject() {
    return this.projectService.getProject();
  }

  @Get('bsb')
  getBSBProject() {
    return this.projectService.getProject();
  }

  @Get('key/:key')
  getProjectByKey(@Param('key') key: string) {
    return this.projectService.getProject(key);
  }

  @Get('statuses')
  getStatuses() {
    return this.projectService.getAllStatuses();
  }

  @Patch('statuses/:id/mapping')
  updateStatusMapping(
    @Param('id') id: string,
    @Body('canonicalStatus') canonicalStatus: CanonicalStatus,
  ) {
    return this.projectService.updateStatusMapping(id, canonicalStatus);
  }
}
