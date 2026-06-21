import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StationsService } from './stations.service';
import { PrismaService } from '../prisma/prisma.service';

/** Prisma 의 station 메서드만 모킹한다. */
const prismaMock = {
  station: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

/** 교대(2·3호선 환승) 조인 결과 — 일부러 priority 역순으로 넣어 정렬 검증. */
const line2 = {
  id: 'line-2',
  name: '2호선',
  nameEn: 'Line 2',
  color: '#00A84D',
  priority: 2,
};
const line3 = {
  id: 'line-3',
  name: '3호선',
  nameEn: 'Line 3',
  color: '#EF7C1C',
  priority: 3,
};

const gyodaeRaw = {
  id: 'seoul-nat-univ-of-education',
  name: '교대',
  nameEn: "Seoul Nat'l Univ. of Education",
  lines: [{ line: line3 }, { line: line2 }],
};

const sillimRaw = {
  id: 'sillim',
  name: '신림',
  nameEn: 'Sillim',
  lines: [{ line: line2 }],
};

describe('StationsService', () => {
  let service: StationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StationsService>(StationsService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('모든 역을 반환하고 lines 를 priority 오름차순으로 정렬한다', async () => {
      prismaMock.station.findMany.mockResolvedValue([gyodaeRaw, sillimRaw]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      // 교대: 대표 노선은 priority 2(2호선)가 첫 번째여야 한다.
      expect(result[0]).toEqual({
        id: 'seoul-nat-univ-of-education',
        name: '교대',
        nameEn: "Seoul Nat'l Univ. of Education",
        lines: [
          {
            lineId: 'line-2',
            lineName: '2호선',
            lineNameEn: 'Line 2',
            lineColor: '#00A84D',
          },
          {
            lineId: 'line-3',
            lineName: '3호선',
            lineNameEn: 'Line 3',
            lineColor: '#EF7C1C',
          },
        ],
      });
      expect(result[1].lines).toHaveLength(1);
    });

    it('역이 없으면 빈 배열을 반환한다', async () => {
      prismaMock.station.findMany.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe('getRandom', () => {
    it('무작위 역 1개를 응답 형태로 반환한다', async () => {
      prismaMock.station.count.mockResolvedValue(2);
      prismaMock.station.findMany.mockResolvedValue([gyodaeRaw]);

      const result = await service.getRandom();

      expect(result.id).toBe('seoul-nat-univ-of-education');
      expect(result.lines[0].lineId).toBe('line-2');
      // count 기반 skip 으로 단건 조회했는지 검증
      expect(prismaMock.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('역이 하나도 없으면 NotFoundException 을 던진다', async () => {
      prismaMock.station.count.mockResolvedValue(0);
      await expect(service.getRandom()).rejects.toThrow(NotFoundException);
      expect(prismaMock.station.findMany).not.toHaveBeenCalled();
    });
  });
});
