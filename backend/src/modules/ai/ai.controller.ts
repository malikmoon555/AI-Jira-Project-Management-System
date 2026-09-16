import { Controller, Post, Body } from '@nestjs/common';
import { AIService } from './ai.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('chat')
  chat(
    @Body()
    body: {
      question: string;
      conversationId?: string;
    },
  ) {
    const convId = body.conversationId || uuidv4();
    return this.aiService.answerPMQuestion(convId, body.question);
  }
}
