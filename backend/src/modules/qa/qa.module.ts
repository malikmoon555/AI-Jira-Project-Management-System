import { Module } from '@nestjs/common';
import { QAService } from './qa.service';
import { QAController } from './qa.controller';

@Module({
  controllers: [QAController],
  providers: [QAService],
  exports: [QAService],
})
export class QAModule {}
