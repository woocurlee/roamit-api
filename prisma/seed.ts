import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * 서울 지하철 2·3호선 시드.
 * - Station.id 는 역명(한글)을 그대로 사용 → 환승역 자동 dedup.
 * - 환승역(교대, 을지로3가)은 Station 1행 + StationLine 2행.
 * - 대표 노선은 Line.priority 로 결정(작을수록 대표). 2호선=2, 3호선=3.
 * - upsert 라 여러 번 실행해도 안전(idempotent).
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL 이 설정되지 않았습니다.');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const lines = [
  { id: 'line-2', name: '2호선', color: '#00A84D', priority: 2 },
  { id: 'line-3', name: '3호선', color: '#EF7C1C', priority: 3 },
];

// 2호선: 본선(순환) + 성수지선 + 신정지선
const line2Stations = [
  // 본선 (순환)
  '시청', '을지로입구', '을지로3가', '을지로4가', '동대문역사문화공원', '신당',
  '상왕십리', '왕십리', '한양대', '뚝섬', '성수', '건대입구', '구의', '강변',
  '잠실나루', '잠실', '잠실새내', '종합운동장', '삼성', '선릉', '역삼', '강남',
  '교대', '서초', '방배', '사당', '낙성대', '서울대입구', '봉천', '신림', '신대방',
  '구로디지털단지', '대림', '신도림', '문래', '영등포구청', '당산', '합정', '홍대입구',
  '신촌', '이대', '아현', '충정로',
  // 성수지선
  '용답', '신답', '용두', '신설동',
  // 신정지선
  '도림천', '양천구청', '신정네거리', '까치산',
];

// 3호선: 대화 → 오금
const line3Stations = [
  '대화', '주엽', '정발산', '마두', '백석', '대곡', '화정', '원당', '원흥', '삼송',
  '지축', '구파발', '연신내', '불광', '녹번', '홍제', '무악재', '독립문', '경복궁',
  '안국', '종로3가', '을지로3가', '충무로', '동대입구', '약수', '금호', '옥수',
  '압구정', '신사', '잠원', '고속터미널', '교대', '남부터미널', '양재', '매봉',
  '도곡', '대치', '학여울', '대청', '일원', '수서', '가락시장', '경찰병원', '오금',
];

async function main() {
  // 1) 노선
  for (const line of lines) {
    await prisma.line.upsert({
      where: { id: line.id },
      update: { name: line.name, color: line.color, priority: line.priority },
      create: line,
    });
  }

  // 2) 역 (한글명을 id 로, 환승역은 자동 dedup)
  const allStations = new Set<string>([...line2Stations, ...line3Stations]);
  for (const name of allStations) {
    await prisma.station.upsert({
      where: { id: name },
      update: { name },
      create: { id: name, name },
    });
  }

  // 3) 역↔노선 연결 (대표 노선은 Line.priority 로 파생되므로 순서 무관)
  const link = async (stationName: string, lineId: string) => {
    await prisma.stationLine.upsert({
      where: { stationId_lineId: { stationId: stationName, lineId } },
      update: {},
      create: { stationId: stationName, lineId },
    });
  };

  for (const name of line2Stations) await link(name, 'line-2');
  for (const name of line3Stations) await link(name, 'line-3');

  // 요약
  const [lineCount, stationCount, linkCount] = await Promise.all([
    prisma.line.count(),
    prisma.station.count(),
    prisma.stationLine.count(),
  ]);
  console.log(
    `시드 완료 → 노선 ${lineCount}개, 역 ${stationCount}개, 연결 ${linkCount}개`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
