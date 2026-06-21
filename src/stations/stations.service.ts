import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type StationResponseDto } from './dto/station-response.dto';

/** station + lines(line 포함) 조인 결과 타입 */
interface StationWithLines {
  id: string;
  name: string;
  nameEn: string;
  lines: {
    line: {
      id: string;
      name: string;
      nameEn: string;
      color: string;
      priority: number;
    };
  }[];
}

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 전체 역 목록. 각 역의 lines 는 Line.priority 오름차순(첫 번째가 대표). */
  async findAll(): Promise<StationResponseDto[]> {
    const stations = await this.prisma.station.findMany({
      include: { lines: { include: { line: true } } },
      orderBy: { name: 'asc' },
    });
    return stations.map((s) => this.toResponseDto(s));
  }

  /** 무작위 역 1개. 역이 없으면 404. */
  async getRandom(): Promise<StationResponseDto> {
    const count = await this.prisma.station.count();
    if (count === 0) {
      throw new NotFoundException('등록된 역이 없습니다.');
    }
    const skip = Math.floor(Math.random() * count);
    const [station] = await this.prisma.station.findMany({
      skip,
      take: 1,
      include: { lines: { include: { line: true } } },
    });
    return this.toResponseDto(station);
  }

  /** 조인 결과를 프론트 응답 형태로 변환(lines 는 priority 오름차순 정렬). */
  private toResponseDto(station: StationWithLines): StationResponseDto {
    const lines = [...station.lines]
      .sort((a, b) => a.line.priority - b.line.priority)
      .map((sl) => ({
        lineId: sl.line.id,
        lineName: sl.line.name,
        lineNameEn: sl.line.nameEn,
        lineColor: sl.line.color,
      }));
    return {
      id: station.id,
      name: station.name,
      nameEn: station.nameEn,
      lines,
    };
  }
}
