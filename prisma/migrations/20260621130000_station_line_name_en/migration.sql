-- Line/Station 에 영문명(nameEn) 추가.
-- 기존 행을 위해 임시 default '' 로 추가 후 default 제거(시드가 실제 값으로 갱신).
ALTER TABLE "Line" ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Line" ALTER COLUMN "nameEn" DROP DEFAULT;

ALTER TABLE "Station" ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Station" ALTER COLUMN "nameEn" DROP DEFAULT;
