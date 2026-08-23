# Roamit API

[Roamit](../roamit) — 모바일 우선 서울 지하철 탐험 앱 — 의 백엔드 API.

- **프레임워크**: NestJS
- **ORM / DB**: Prisma + PostgreSQL
- **인증**: 구글 OAuth → 자체 JWT (access stateless + refresh 저장/회전)

설계 문서: [`docs/DATABASE.md`](docs/DATABASE.md) — DB 스키마, 도메인 모델, 인증 플로우, API 윤곽.

## 모노레포 구조

```
workspace/roamit/
├── roamit/      # 프론트엔드 (Next.js)
└── roamit-api/  # 백엔드 (이 레포)
```

## 요구 사항

- Node.js 20+
- Docker (로컬 dev DB)

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env   # 값 채우기 (구글 OAuth, JWT 시크릿 등)

# 3. 로컬 DB 기동 (PostgreSQL on Docker)
docker compose up -d

# 4. DB 마이그레이션 적용 + Prisma Client 생성
npx prisma migrate dev

# 5. 개발 서버 실행
npm run start:dev
```

## 로컬 개발 주소 & CORS

| 서비스 | 주소 |
|---|---|
| 백엔드 (roamit-api) | http://localhost:3000 |
| 프론트엔드 (roamit) | http://localhost:3001 |

프론트엔드 기본 포트(3000)는 백엔드와 겹치므로, roamit 저장소에서는 `npm run dev`(내부적으로 `next dev -p 3001`)로 3001 포트를 사용합니다.

백엔드는 `CORS_ORIGIN` 환경변수에 등록된 origin만 허용하고(`.env.example` 기본값: `http://localhost:3001`), 목록에 없는 origin의 요청은 차단합니다. 쿠키 등 credentials 를 포함한 요청을 허용하려면 `CORS_CREDENTIALS=true`로 설정하세요. 배포 환경에서는 실제 프론트엔드 도메인으로 `CORS_ORIGIN`을 교체합니다.

roamit 프론트엔드에서 이 API를 호출하려면 `.env.local`에 다음과 같이 설정합니다.

```bash
# roamit/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

## 주요 스크립트

```bash
npm run start:dev      # 개발 (watch)
npm run start:prod     # 프로덕션
npm run build          # 빌드
npm run test           # 단위 테스트
npm run test:e2e       # e2e 테스트
```

## 데이터베이스

```bash
docker compose up -d              # DB 컨테이너 시작
docker compose down               # DB 컨테이너 중지
npx prisma migrate dev            # 마이그레이션 생성/적용
npx prisma studio                 # DB GUI
```

> Prisma 7 참고
> - DB 접속 URL은 `schema.prisma`가 아니라 **`prisma.config.ts`** (`env.DATABASE_URL`)에서 관리됩니다.
> - 생성된 Prisma Client는 **`generated/prisma`** 에 위치합니다 (import 경로 주의).

## 데이터 모델

| 영역 | 모델 |
|---|---|
| 사용자/인증 | `User`, `Account`, `Session` |
| 지하철 마스터 | `Line`, `Station`, `StationLine` |
| 탐험/리뷰 | `Exploration`, `PlaceReview` |

자세한 내용은 [`docs/DATABASE.md`](docs/DATABASE.md) 참고.
