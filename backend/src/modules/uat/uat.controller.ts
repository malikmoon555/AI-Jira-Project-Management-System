import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { UATService } from './uat.service';

@Controller('uat')
export class UATController {
  constructor(private readonly uatService: UATService) {}

  @Get('validations')
  getValidations(@Query('issueKey') issueKey?: string) {
    return this.uatService.getValidations(issueKey);
  }

  @Post('evaluate/:key')
  evaluateIssue(@Param('key') key: string) {
    return this.uatService.evaluateIssue(key);
  }
}
