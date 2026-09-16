import { Controller, Post, Body, Param, HttpCode } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('jira')
  @HttpCode(200)
  handleJiraWebhook(@Body() body: any) {
    return this.webhookService.handleJiraWebhook(body);
  }

  @Post('git/:provider')
  @HttpCode(200)
  handleGitWebhook(@Param('provider') provider: string, @Body() body: any) {
    return this.webhookService.handleGitWebhook(provider, body);
  }
}
