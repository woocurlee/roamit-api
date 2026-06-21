-- Line.priority 추가: 대표 노선 우선순위를 노선이 보유 (작을수록 대표).
-- 기존 행을 위해 임시 default 로 추가 후 default 제거(시드가 실제 값으로 갱신).
ALTER TABLE "Line" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Line" ALTER COLUMN "priority" DROP DEFAULT;

-- StationLine.order 제거: 역의 대표 노선은 이제 Line.priority 로 파생.
ALTER TABLE "StationLine" DROP COLUMN "order";
