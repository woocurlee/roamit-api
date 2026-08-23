import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { createCorsOptions } from './../src/config/cors.config';

describe('CORS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // .env 로컬 설정과 무관하게 테스트 값을 강제(dotenv 는 기존 process.env 를 덮어쓰지 않음)
    process.env.CORS_ORIGIN = 'http://localhost:3001';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.enableCors(createCorsOptions(app.get(ConfigService)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('허용된 origin 요청에는 Access-Control-Allow-Origin 헤더를 포함한다', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'http://localhost:3001');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3001',
    );
  });

  it('허용되지 않은 origin 요청은 차단하고 CORS 헤더를 포함하지 않는다', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'http://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
