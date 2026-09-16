import { Controller, Post, Param } from '@nestjs/common';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Post('recalculate')
  recalculateAll() {
    return this.riskService.recalculateAllRisks();
  }

  @Post('recalculate/:id')
  recalculateOne(@Param('id') id: string) {
    return this.riskService.calculateRiskForIssue(id);
  }
}
