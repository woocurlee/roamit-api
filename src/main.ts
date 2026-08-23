import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createCorsOptions } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS_ORIGIN(허용 origin 목록) / CORS_CREDENTIALS 환경변수로 정책 관리
  app.enableCors(createCorsOptions(app.get(ConfigService)));

  // Swagger(OpenAPI) 문서 — http://localhost:3001/api-docs
  const config = new DocumentBuilder()
    .setTitle('Roamit API')
    .setDescription('서울 지하철 탐험 앱 Roamit 백엔드 API')
    .setVersion('0.1.0')
    .addBearerAuth() // JWT 도입 후 Authorize 버튼으로 토큰 입력
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3001);
}
void bootstrap();
