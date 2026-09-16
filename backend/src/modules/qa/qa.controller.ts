import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { QAService } from './qa.service';

@Controller('qa')
export class QAController {
  constructor(private readonly qaService: QAService) {}

  @Get('validations')
  getValidations(@Query('issueKey') issueKey?: string) {
    return this.qaService.getValidations(issueKey);
  }

  @Post('evaluate/:key')
  evaluateIssue(@Param('key') key: string) {
    return this.qaService.evaluateIssue(key);
  }
}
