import { type ConfigService } from '@nestjs/config';
import { createCorsOptions, parseAllowedOrigins } from './cors.config';

/** origin 콜백을 호출해 (에러, 허용여부)를 반환하는 헬퍼. */
function checkOrigin(
  options: ReturnType<typeof createCorsOptions>,
  requestOrigin: string | undefined,
): Promise<{ err: Error | null; allow?: boolean }> {
  return new Promise((resolve) => {
    const origin = options.origin as (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void;
    origin(requestOrigin, (err, allow) => resolve({ err, allow }));
  });
}

function makeConfigService(
  env: Record<string, string | undefined>,
): ConfigService {
  return { get: (key: string) => env[key] } as ConfigService;
}

describe('parseAllowedOrigins', () => {
  it('쉼표로 구분된 origin 목록을 공백 제거 후 배열로 변환한다', () => {
    expect(
      parseAllowedOrigins('http://localhost:3001, http://localhost:3002'),
    ).toEqual(['http://localhost:3001', 'http://localhost:3002']);
  });

  it('값이 없으면(undefined/빈 문자열) 빈 배열을 반환한다', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins('')).toEqual([]);
  });
});

describe('createCorsOptions', () => {
  it('CORS_ORIGIN 목록에 있는 origin 은 허용한다', async () => {
    const options = createCorsOptions(
      makeConfigService({ CORS_ORIGIN: 'http://localhost:3001' }),
    );
    const { err, allow } = await checkOrigin(options, 'http://localhost:3001');
    expect(err).toBeNull();
    expect(allow).toBe(true);
  });

  it('CORS_ORIGIN 목록에 없는 origin 은 차단한다', async () => {
    const options = createCorsOptions(
      makeConfigService({ CORS_ORIGIN: 'http://localhost:3001' }),
    );
    const { err } = await checkOrigin(options, 'http://evil.example.com');
    expect(err).toBeInstanceOf(Error);
  });

  it('Origin 헤더가 없는 요청(서버 간 통신 등)은 허용한다', async () => {
    const options = createCorsOptions(
      makeConfigService({ CORS_ORIGIN: 'http://localhost:3001' }),
    );
    const { err, allow } = await checkOrigin(options, undefined);
    expect(err).toBeNull();
    expect(allow).toBe(true);
  });

  it('CORS_CREDENTIALS=true 이면 credentials 를 true 로 설정한다', () => {
    const options = createCorsOptions(
      makeConfigService({ CORS_CREDENTIALS: 'true' }),
    );
    expect(options.credentials).toBe(true);
  });

  it('CORS_CREDENTIALS 가 없으면 기본값 false 로 설정한다', () => {
    const options = createCorsOptions(makeConfigService({}));
    expect(options.credentials).toBe(false);
  });
});
