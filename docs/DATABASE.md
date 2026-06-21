# Roamit API — 데이터베이스 & 도메인 설계

> 이 문서는 **DB 스키마**를 1차 기준으로 백엔드 도메인 모델과 API 윤곽을 정의한다.
> 프론트엔드(`roamit`)의 `CLAUDE.md` 데이터 모델(Station / Exploration / PlaceReview)을 백엔드 정본 스키마로 정규화한 것이다.
> 코드(Prisma migration, Nest 모듈)는 이 문서 합의 후 생성한다.

---

## 1. 설계 원칙

1. **프론트 모델은 "뷰", DB는 "정규화된 정본"** — 프론트의 `Station.lines`, `Exploration.lineName`/`lineColor` 같은 평탄화/스냅샷 필드는 DB에서 정규화하고, API 응답에서 다시 조립한다.
2. **스냅샷은 의도적으로 비정규화** — `Exploration`은 "방문 시점의 기록"이므로, 노선 이름/색은 당시 값을 **복사 저장**한다. 나중에 역/노선 메타데이터가 바뀌어도 과거 기록은 보존된다. (CLAUDE.md: "기록 시점의 대표 노선")
3. **`visited`는 컬럼이 아니라 파생값** — 특정 역의 방문 여부는 "그 유저가 해당 역에 Exploration을 가졌는가"로 계산한다. 역 테이블에 전역 `visited`를 두지 않는다.
4. **사용자 소유권** — 모든 Exploration/PlaceReview는 한 User에 속한다. MVP는 개인 일기지만 백엔드는 처음부터 멀티 유저 전제로 설계한다.
5. **MVP 단순성 우선** — 사진은 1차로 URL 배열(`text[]`)로 저장. 별도 Photo 테이블/메타데이터가 필요해지면 그때 정규화(아래 §6 참고).

---

## 2. ERD (개념도)

```
User 1───* Exploration 1───* PlaceReview
                │
                * (FK) Station *───* Line   (StationLine 조인)
```

- `User` 1 : N `Exploration`
- `Exploration` 1 : N `PlaceReview`
- `Exploration` N : 1 `Station` (어느 역을 방문했나)
- `Station` N : M `Line` (환승역은 여러 노선) — 조인 테이블 `StationLine`

---

## 3. 테이블 정의

### 3.1 `User` — 사용자
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | |
| email | text (unique) | 구글 계정 이메일 |
| nickname | text | 표시 이름 (구글 `name` 초기값) |
| avatarUrl | text? | 구글 `picture` 초기값 |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

> 자격증명은 `Account`로 분리. `User`는 프로필(서비스 내부 표현)만 담당해서, 추후 다른 provider(카카오 등) 추가 시에도 한 유저가 여러 계정을 연결할 수 있다.

### 3.1.1 `Account` — OAuth 연결 계정 (구글)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | |
| userId | uuid (FK→User) | 소유 유저 |
| provider | text | `"google"` (확장 대비 컬럼화) |
| providerAccountId | text | 구글 `sub` (계정 고유 ID, 불변) |
| createdAt | timestamptz | |

> UNIQUE (provider, providerAccountId) — 동일 구글 계정 중복 가입 방지 및 로그인 시 식별 키.
> 구글 토큰(access/refresh)은 DB에 저장하지 않는다(프로필 조회용 1회성). 우리 서비스 세션은 자체 JWT로 발급하고, refresh token만 `Session`에 저장한다(§3.1.2, §9).

### 3.1.2 `Session` — refresh token 저장 (세션 관리)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | |
| userId | uuid (FK→User) | 소유 유저 |
| tokenHash | text | refresh token의 해시 (평문 저장 금지) |
| expiresAt | timestamptz | refresh 만료 시각 |
| revokedAt | timestamptz? | 로그아웃/회전 시 무효화 표시 |
| userAgent | text? | 기기 식별(선택, 다중 로그인 관리용) |
| createdAt | timestamptz | |

> **refresh token 회전(rotation)**: refresh 사용 시 기존 row를 무효화하고 새 row 발급 → 탈취 재사용 탐지 가능.
> 로그아웃 = 해당 `Session` revoke. 전체 로그아웃 = 유저의 모든 `Session` revoke.
> access token은 여전히 stateless JWT(저장 안 함, 짧은 만료로 통제).

### 3.2 `Line` — 지하철 노선 (마스터 데이터)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | text (PK) | 예: `"line-2"` (lineId) |
| name | text | 한글명, 예: `"2호선"` |
| nameEn | text | 영문명, 예: `"Line 2"` |
| color | text | hex, 예: `"#00A84D"` |
| priority | int | 대표 노선 우선순위(작을수록 대표). 노선 번호 사용(2호선=2). |

> 시드 데이터로 채우는 정적 마스터. 서울 1~9호선 + 분당/신분당 등.
> **대표 노선 결정은 노선이 보유한 `priority`로 한다** — 환승역의 대표 노선 = 그 역이 속한 노선들 중 `priority` 최소값. (역별 코드 레벨 결정이 아니라 데이터로 일관)

### 3.3 `Station` — 역 (마스터 데이터)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | text (PK) | 영문 slug, 예: `"gangnam"`. 환승역은 동일 slug 로 dedup |
| name | text | 한글 역명, 예: `"강남"` |
| nameEn | text | 영문 역명, 예: `"Gangnam"` |

> `lines`와 `visited`는 컬럼 아님 → `lines`는 `StationLine` 조인으로, `visited`는 유저별 파생값으로 제공.
> **`id` 는 영문 slug** — 한글 PK의 URL 인코딩/가독성 문제를 피하고, 환승역(교대·을지로3가 등)은 동일 slug 라 시드 upsert 시 자동 dedup 된다.

### 3.4 `StationLine` — 역↔노선 조인 (환승역 표현)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| stationId | text (FK→Station) | |
| lineId | text (FK→Line) | |

> PK = (stationId, lineId) 복합.
> 역의 `lines` 정렬 및 대표 노선(첫 번째)은 조인 시 `Line.priority` 오름차순으로 결정한다 (조인 테이블에 순서 컬럼을 두지 않음).

### 3.5 `Exploration` — 탐험 (단일 역 방문 스냅샷)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | |
| userId | uuid (FK→User) | 소유자 |
| stationId | text (FK→Station) | 방문한 역 |
| stationName | text | **스냅샷** (기록 시점 역명) |
| lineName | text | **스냅샷** 대표 노선명 |
| lineColor | text | **스냅샷** 대표 노선색 |
| summaryMemo | text? | 탐험 요약 메모 |
| photos | text[] | 사진 URL 배열 |
| visitedAt | timestamptz | 방문 일시 |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

> `stationName/lineName/lineColor`를 복사 저장하는 이유 = 과거 기록 불변 보존(§1-2). `stationId`는 "어느 역 컬렉션에 속하나"(진행도 계산)에 사용.

### 3.6 `PlaceReview` — 장소 리뷰 (탐험 내 방문 장소)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | |
| explorationId | uuid (FK→Exploration) | 소속 탐험 |
| name | text | 장소명 |
| type | text | 분류 코드 (예: `"cafe"`) |
| typeLabel | text | 표시 라벨 (예: `"카페"`) |
| memo | text? | |
| rating | int | 평점 (1~5, CHECK 제약) |
| photos | text[] | 사진 URL 배열 |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

---

## 4. 인덱스 / 제약

- `User.email` UNIQUE
- `StationLine` PK (stationId, lineId)
- `Exploration(userId, visitedAt desc)` — 유저 탐험 목록 정렬 조회
- `Exploration(userId, stationId)` — 역 방문 여부/컬렉션 진행도 계산
- `PlaceReview(explorationId)` — 탐험별 리뷰 조회
- `PlaceReview.rating` CHECK (1 ≤ rating ≤ 5)
- FK on delete: `Exploration` 삭제 시 `PlaceReview` CASCADE

---

## 5. Prisma 스키마 (초안)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  nickname     String
  avatarUrl    String?
  accounts     Account[]
  sessions     Session[]
  explorations Exploration[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model Session {
  id        String    @id @default(uuid())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  tokenHash String
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  createdAt DateTime  @default(now())

  @@index([userId])
}

model Account {
  id                String   @id @default(uuid())
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String
  provider          String   // "google"
  providerAccountId String   // google sub
  createdAt         DateTime @default(now())

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Line {
  id       String        @id
  name     String // 한글명 (예: "2호선")
  nameEn   String // 영문명 (예: "Line 2")
  color    String
  priority Int // 작을수록 대표 노선
  stations StationLine[]
}

model Station {
  id           String        @id // 영문 slug (예: "gangnam")
  name         String // 한글명 (예: "강남")
  nameEn       String // 영문명 (예: "Gangnam")
  lines        StationLine[]
  explorations Exploration[]
}

model StationLine {
  station   Station @relation(fields: [stationId], references: [id])
  stationId String
  line      Line    @relation(fields: [lineId], references: [id])
  lineId    String

  @@id([stationId, lineId])
}

model Exploration {
  id          String        @id @default(uuid())
  user        User          @relation(fields: [userId], references: [id])
  userId      String
  station     Station       @relation(fields: [stationId], references: [id])
  stationId   String
  stationName String        // snapshot
  lineName    String        // snapshot
  lineColor   String        // snapshot
  summaryMemo String?
  photos      String[]
  visitedAt   DateTime
  places      PlaceReview[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([userId, visitedAt(sort: Desc)])
  @@index([userId, stationId])
}

model PlaceReview {
  id            String      @id @default(uuid())
  exploration   Exploration @relation(fields: [explorationId], references: [id], onDelete: Cascade)
  explorationId String
  name          String
  type          String
  typeLabel     String
  memo          String?
  rating        Int
  photos        String[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([explorationId])
}
```

---

## 6. 향후 확장 시 분리 후보

| 항목 | MVP | 확장 시 |
|---|---|---|
| 사진 | `text[]` URL | `Photo` 테이블 (width/height/blurhash/순서) |
| 인증 | 구글 OAuth (`Account`) | 카카오/애플 provider 추가 (동일 `Account` 구조 재사용) |
| 배지/게임화 | 없음 | `Badge`, `UserBadge`(획득 시각) |
| 역 메타 | id/name | 위경도, 출구, 동네 태그 |

---

## 7. API 윤곽 (프론트 서비스 레이어 매핑)

프론트 `CLAUDE.md`의 서비스 함수에 1:1 대응:

| 프론트 함수 | HTTP | 비고 |
|---|---|---|
| `getStations()` | `GET /stations` | lines 조립 + 유저별 visited 포함 |
| `getRandomStation()` | `GET /stations/random` | 서버에서 랜덤 추출 |
| `getExplorations()` | `GET /explorations` | 본인 것, visitedAt desc |
| `createExploration()` | `POST /explorations` | places 중첩 생성 허용 |
| `getUserStats()` | `GET /me/stats` | 방문 역 수 / 진행도 / (배지) |

부가:
- `GET /explorations/:id` — 상세 (places 포함)
- `POST /explorations/:id/places` — 리뷰 추가 (CLAUDE.md 핵심 플로우)

> 응답 DTO는 프론트 타입과 정렬: `Station.lines`는 `Line.priority` 오름차순으로 매핑(첫 번째가 대표 노선), `Exploration`은 스냅샷 필드 그대로 노출.

---

## 9. 인증 (구글 OAuth)

### 9.1 로그인 플로우
```
[모바일 웹]                [roamit-api]                 [Google]
   │ 1. "구글 로그인" 클릭                                  │
   │ ───────── GET /auth/google ────────▶                  │
   │ 2. 구글 동의화면으로 302 redirect ───────────────────▶ │
   │ 3. 사용자 동의 후 code 발급 (callback) ◀───────────────│
   │ ◀──── GET /auth/google/callback?code=... ───          │
   │           4. code → 토큰 교환, 프로필(sub/email/name/picture) 조회
   │           5. Account(provider=google, sub) 조회
   │              ├ 있으면: 기존 User 로그인
   │              └ 없으면: User + Account 생성 (가입)
   │           6. 자체 JWT 발급 (access + refresh)
   │ ◀──── set refresh(httpOnly cookie) + access 반환 ──────│
```

### 9.2 세션 전략
- **자체 JWT 발급** — 구글 토큰은 프로필 조회용 1회성. 이후 세션은 우리 서버 JWT로 관리.
- **Access token**: 짧은 만료(예 15분), `Authorization: Bearer`로 전달. 프론트 메모리 보관.
- **Refresh token**: 긴 만료(예 30일), `httpOnly` + `Secure` + `SameSite` 쿠키. 해시를 `Session`에 저장하고 사용 시 **회전(rotation)**. `POST /auth/refresh`로 access 재발급.
- **무효화**: 로그아웃/계정정지 시 해당 `Session`을 revoke → refresh 재사용 차단(stateless JWT의 약점 보완).
- **보호 라우트**: NestJS `JwtAuthGuard`로 access 검증, `req.user.id`를 소유권 체크에 사용.

### 9.3 인증 관련 엔드포인트
| HTTP | 설명 |
|---|---|
| `GET /auth/google` | 구글 동의화면으로 redirect |
| `GET /auth/google/callback` | code 처리 → 가입/로그인 → JWT 발급 |
| `POST /auth/refresh` | refresh 쿠키로 access 재발급 |
| `POST /auth/logout` | refresh 쿠키 무효화 |
| `GET /me` | 현재 로그인 유저 프로필 |

### 9.4 필요한 환경변수
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=     # 예: https://api.roamit.app/auth/google/callback
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
DATABASE_URL=
```

> 구현은 `passport-google-oauth20` + `@nestjs/passport` 조합을 기본 후보로 한다.

---

## 10. 다음 단계 (이 문서 합의 후)

1. NestJS 프로젝트 스캐폴딩 (`nest new` / pnpm)
2. Prisma 설치 + 위 스키마로 첫 migration
3. Line/Station 시드 스크립트 (서울 지하철 데이터)
4. 모듈 단위 구현: `auth(구글 OAuth)` → `stations` → `explorations`
