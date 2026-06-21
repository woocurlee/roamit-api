/**
 * 프론트 `Station` 타입에 맞춘 응답 형태.
 * - lines 는 Line.priority 오름차순 (첫 번째가 대표 노선)
 * - visited 는 유저별 파생값 → 인증 도입 후 채움(현재는 미포함)
 */
export interface StationLineDto {
  lineId: string;
  lineName: string;
  lineColor: string;
}

export interface StationResponseDto {
  id: string;
  name: string;
  lines: StationLineDto[];
}
