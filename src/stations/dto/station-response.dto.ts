import { ApiProperty } from '@nestjs/swagger';

/**
 * 프론트 `Station` 타입에 맞춘 응답 형태.
 * - lines 는 Line.priority 오름차순 (첫 번째가 대표 노선)
 * - visited 는 유저별 파생값 → 인증 도입 후 채움(현재는 미포함)
 */
export class StationLineDto {
  @ApiProperty({ example: 'line-2', description: '노선 ID' })
  lineId!: string;

  @ApiProperty({ example: '2호선', description: '노선 한글명' })
  lineName!: string;

  @ApiProperty({ example: 'Line 2', description: '노선 영문명' })
  lineNameEn!: string;

  @ApiProperty({ example: '#00A84D', description: '노선 색상(hex)' })
  lineColor!: string;
}

export class StationResponseDto {
  @ApiProperty({ example: 'gangnam', description: '역 ID(영문 slug)' })
  id!: string;

  @ApiProperty({ example: '강남', description: '역 한글명' })
  name!: string;

  @ApiProperty({ example: 'Gangnam', description: '역 영문명' })
  nameEn!: string;

  @ApiProperty({
    type: [StationLineDto],
    description: '소속 노선 목록(priority 오름차순, 첫 번째가 대표 노선)',
  })
  lines!: StationLineDto[];
}
