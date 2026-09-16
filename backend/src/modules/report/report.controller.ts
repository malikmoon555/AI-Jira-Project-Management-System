import { Controller, Get, Post } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('latest')
  getLatestReport() {
    return this.reportService.getLatestReport();
  }

  @Get()
  getAllReports() {
    return this.reportService.getAllReports();
  }

  @Post('generate')
  generateDailyReport() {
    return this.reportService.generateDailyReport();
  }
}
