import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL;

  const allowedOrigins: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  if (frontendUrl) {
    allowedOrigins.push(frontendUrl.replace(/\/$/, ''));
  }

  // Allow all Vercel production and preview subdomains
  allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('WrightPay API')
    .setDescription('WrightPay V1 API backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
