import { Controller, Get, Post, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Post('jira')
  updateJira(
    @Body()
    body: {
      domain: string;
      email: string;
      apiToken: string;
      projectKey?: string;
    },
  ) {
    return this.settingsService.updateJiraSettings(body);
  }
}
