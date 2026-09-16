import { Controller, Get } from '@nestjs/common';
import { DeveloperService } from './developer.service';

@Controller('developers')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Get()
  getDevelopers() {
    return this.developerService.getDevelopersSummary();
  }
}
