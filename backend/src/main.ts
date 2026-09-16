import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger OpenAPI Docs
  const config = new DocumentBuilder()
    .setTitle('AI-Powered Jira PM Monitoring System API')
    .setDescription(
      'REST API monitoring Jira Cloud issues (BSB-2771, BSB-2652, BSB-2559, BSB-2606, BSB-2690), Git repositories, QA/UAT gates, and AI-driven reporting.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`NestJS Backend server running on: http://localhost:${port}/api`);
  logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
