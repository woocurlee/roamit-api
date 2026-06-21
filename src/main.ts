import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger(OpenAPI) 문서 — http://localhost:3000/api-docs
  const config = new DocumentBuilder()
    .setTitle('Roamit API')
    .setDescription('서울 지하철 탐험 앱 Roamit 백엔드 API')
    .setVersion('0.1.0')
    .addBearerAuth() // JWT 도입 후 Authorize 버튼으로 토큰 입력
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
void bootstrap();
