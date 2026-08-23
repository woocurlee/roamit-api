import { type ConfigService } from '@nestjs/config';
import { type CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** `CORS_ORIGIN` 값("http://a,http://b")을 공백 제거된 origin 배열로 변환. */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * `CORS_ORIGIN` / `CORS_CREDENTIALS` 환경변수 기반 CORS 옵션.
 * - Origin 헤더가 없는 요청(서버 간 통신, curl 등)은 브라우저 CORS 대상이 아니므로 허용
 * - `CORS_ORIGIN` 목록에 없는 origin 은 콜백에 에러를 전달해 차단
 */
export function createCorsOptions(configService: ConfigService): CorsOptions {
  const allowedOrigins = parseAllowedOrigins(
    configService.get<string>('CORS_ORIGIN'),
  );

  return {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`허용되지 않은 origin 입니다: ${requestOrigin}`));
    },
    credentials: configService.get<string>('CORS_CREDENTIALS') === 'true',
  };
}
