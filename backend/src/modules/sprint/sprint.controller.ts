import { Controller, Get } from '@nestjs/common';
import { SprintService } from './sprint.service';

@Controller('sprints')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Get('active')
  getActiveSprint() {
    return this.sprintService.getActiveSprint();
  }

  @Get()
  getAllSprints() {
    return this.sprintService.getAllSprints();
  }
}
