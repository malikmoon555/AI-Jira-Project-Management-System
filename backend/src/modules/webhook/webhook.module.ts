import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { GitModule } from '../git/git.module';
import { JiraModule } from '../jira/jira.module';

@Module({
  imports: [GitModule, JiraModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
