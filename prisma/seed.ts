import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * 서울 지하철 2·3호선 시드.
 * - Station.id 는 영문 slug(예: "gangnam") → URL/로그 친화적, 환승역은 동일 slug 로 자동 dedup.
 * - 환승역(교대, 을지로3가)은 Station 1행 + StationLine 2행.
 * - 대표 노선은 Line.priority 로 결정(작을수록 대표). 2호선=2, 3호선=3.
 * - upsert 라 여러 번 실행해도 안전(idempotent). 끝에서 옛 id 잔재를 정리한다.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL 이 설정되지 않았습니다.');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const lines = [
  {
    id: 'line-2',
    name: '2호선',
    nameEn: 'Line 2',
    color: '#00A84D',
    priority: 2,
  },
  {
    id: 'line-3',
    name: '3호선',
    nameEn: 'Line 3',
    color: '#EF7C1C',
    priority: 3,
  },
];

/** 한글 역명 → { slug(=Station.id), 영문명 }. 환승역은 한 번만 정의한다. */
const stationInfo: Record<string, { slug: string; en: string }> = {
  // 2호선 본선
  시청: { slug: 'city-hall', en: 'City Hall' },
  을지로입구: { slug: 'euljiro-1-ga', en: 'Euljiro 1-ga' },
  을지로3가: { slug: 'euljiro-3-ga', en: 'Euljiro 3-ga' },
  을지로4가: { slug: 'euljiro-4-ga', en: 'Euljiro 4-ga' },
  동대문역사문화공원: {
    slug: 'dongdaemun-history-culture-park',
    en: 'Dongdaemun History & Culture Park',
  },
  신당: { slug: 'sindang', en: 'Sindang' },
  상왕십리: { slug: 'sangwangsimni', en: 'Sangwangsimni' },
  왕십리: { slug: 'wangsimni', en: 'Wangsimni' },
  한양대: { slug: 'hanyang-univ', en: 'Hanyang Univ.' },
  뚝섬: { slug: 'ttukseom', en: 'Ttukseom' },
  성수: { slug: 'seongsu', en: 'Seongsu' },
  건대입구: { slug: 'konkuk-univ', en: 'Konkuk Univ.' },
  구의: { slug: 'guui', en: 'Guui' },
  강변: { slug: 'gangbyeon', en: 'Gangbyeon' },
  잠실나루: { slug: 'jamsillaru', en: 'Jamsillaru' },
  잠실: { slug: 'jamsil', en: 'Jamsil' },
  잠실새내: { slug: 'jamsilsaenae', en: 'Jamsilsaenae' },
  종합운동장: { slug: 'sports-complex', en: 'Sports Complex' },
  삼성: { slug: 'samseong', en: 'Samseong' },
  선릉: { slug: 'seolleung', en: 'Seolleung' },
  역삼: { slug: 'yeoksam', en: 'Yeoksam' },
  강남: { slug: 'gangnam', en: 'Gangnam' },
  교대: {
    slug: 'seoul-nat-univ-of-education',
    en: "Seoul Nat'l Univ. of Education",
  },
  서초: { slug: 'seocho', en: 'Seocho' },
  방배: { slug: 'bangbae', en: 'Bangbae' },
  사당: { slug: 'sadang', en: 'Sadang' },
  낙성대: { slug: 'nakseongdae', en: 'Nakseongdae' },
  서울대입구: { slug: 'seoul-nat-univ', en: "Seoul Nat'l Univ." },
  봉천: { slug: 'bongcheon', en: 'Bongcheon' },
  신림: { slug: 'sillim', en: 'Sillim' },
  신대방: { slug: 'sindaebang', en: 'Sindaebang' },
  구로디지털단지: { slug: 'guro-digital-complex', en: 'Guro Digital Complex' },
  대림: { slug: 'daerim', en: 'Daerim' },
  신도림: { slug: 'sindorim', en: 'Sindorim' },
  문래: { slug: 'mullae', en: 'Mullae' },
  영등포구청: { slug: 'yeongdeungpo-gu-office', en: 'Yeongdeungpo-gu Office' },
  당산: { slug: 'dangsan', en: 'Dangsan' },
  합정: { slug: 'hapjeong', en: 'Hapjeong' },
  홍대입구: { slug: 'hongik-univ', en: 'Hongik Univ.' },
  신촌: { slug: 'sinchon', en: 'Sinchon' },
  이대: { slug: 'ewha-womans-univ', en: 'Ewha Womans Univ.' },
  아현: { slug: 'ahyeon', en: 'Ahyeon' },
  충정로: { slug: 'chungjeongno', en: 'Chungjeongno' },
  // 2호선 성수지선
  용답: { slug: 'yongdap', en: 'Yongdap' },
  신답: { slug: 'sindap', en: 'Sindap' },
  용두: { slug: 'yongdu', en: 'Yongdu' },
  신설동: { slug: 'sinseol-dong', en: 'Sinseol-dong' },
  // 2호선 신정지선
  도림천: { slug: 'dorimcheon', en: 'Dorimcheon' },
  양천구청: { slug: 'yangcheon-gu-office', en: 'Yangcheon-gu Office' },
  신정네거리: { slug: 'sinjeongnegeori', en: 'Sinjeongnegeori' },
  까치산: { slug: 'kkachisan', en: 'Kkachisan' },
  // 3호선
  대화: { slug: 'daehwa', en: 'Daehwa' },
  주엽: { slug: 'juyeop', en: 'Juyeop' },
  정발산: { slug: 'jeongbalsan', en: 'Jeongbalsan' },
  마두: { slug: 'madu', en: 'Madu' },
  백석: { slug: 'baekseok', en: 'Baekseok' },
  대곡: { slug: 'daegok', en: 'Daegok' },
  화정: { slug: 'hwajeong', en: 'Hwajeong' },
  원당: { slug: 'wondang', en: 'Wondang' },
  원흥: { slug: 'wonheung', en: 'Wonheung' },
  삼송: { slug: 'samsong', en: 'Samsong' },
  지축: { slug: 'jichuk', en: 'Jichuk' },
  구파발: { slug: 'gupabal', en: 'Gupabal' },
  연신내: { slug: 'yeonsinnae', en: 'Yeonsinnae' },
  불광: { slug: 'bulgwang', en: 'Bulgwang' },
  녹번: { slug: 'nokbeon', en: 'Nokbeon' },
  홍제: { slug: 'hongje', en: 'Hongje' },
  무악재: { slug: 'muakjae', en: 'Muakjae' },
  독립문: { slug: 'dongnimmun', en: 'Dongnimmun' },
  경복궁: { slug: 'gyeongbokgung', en: 'Gyeongbokgung' },
  안국: { slug: 'anguk', en: 'Anguk' },
  종로3가: { slug: 'jongno-3-ga', en: 'Jongno 3-ga' },
  충무로: { slug: 'chungmuro', en: 'Chungmuro' },
  동대입구: { slug: 'dongguk-univ', en: 'Dongguk Univ.' },
  약수: { slug: 'yaksu', en: 'Yaksu' },
  금호: { slug: 'geumho', en: 'Geumho' },
  옥수: { slug: 'oksu', en: 'Oksu' },
  압구정: { slug: 'apgujeong', en: 'Apgujeong' },
  신사: { slug: 'sinsa', en: 'Sinsa' },
  잠원: { slug: 'jamwon', en: 'Jamwon' },
  고속터미널: { slug: 'express-bus-terminal', en: 'Express Bus Terminal' },
  남부터미널: { slug: 'nambu-bus-terminal', en: 'Nambu Bus Terminal' },
  양재: { slug: 'yangjae', en: 'Yangjae' },
  매봉: { slug: 'maebong', en: 'Maebong' },
  도곡: { slug: 'dogok', en: 'Dogok' },
  대치: { slug: 'daechi', en: 'Daechi' },
  학여울: { slug: 'hangnyeoul', en: 'Hangnyeoul' },
  대청: { slug: 'daecheong', en: 'Daecheong' },
  일원: { slug: 'irwon', en: 'Irwon' },
  수서: { slug: 'suseo', en: 'Suseo' },
  가락시장: { slug: 'garak-market', en: 'Garak Market' },
  경찰병원: { slug: 'police-hospital', en: 'Police Hospital' },
  오금: { slug: 'ogeum', en: 'Ogeum' },
};

// 2호선: 본선(순환) + 성수지선 + 신정지선
const line2Stations = [
  // 본선 (순환)
  '시청',
  '을지로입구',
  '을지로3가',
  '을지로4가',
  '동대문역사문화공원',
  '신당',
  '상왕십리',
  '왕십리',
  '한양대',
  '뚝섬',
  '성수',
  '건대입구',
  '구의',
  '강변',
  '잠실나루',
  '잠실',
  '잠실새내',
  '종합운동장',
  '삼성',
  '선릉',
  '역삼',
  '강남',
  '교대',
  '서초',
  '방배',
  '사당',
  '낙성대',
  '서울대입구',
  '봉천',
  '신림',
  '신대방',
  '구로디지털단지',
  '대림',
  '신도림',
  '문래',
  '영등포구청',
  '당산',
  '합정',
  '홍대입구',
  '신촌',
  '이대',
  '아현',
  '충정로',
  // 성수지선
  '용답',
  '신답',
  '용두',
  '신설동',
  // 신정지선
  '도림천',
  '양천구청',
  '신정네거리',
  '까치산',
];

// 3호선: 대화 → 오금
const line3Stations = [
  '대화',
  '주엽',
  '정발산',
  '마두',
  '백석',
  '대곡',
  '화정',
  '원당',
  '원흥',
  '삼송',
  '지축',
  '구파발',
  '연신내',
  '불광',
  '녹번',
  '홍제',
  '무악재',
  '독립문',
  '경복궁',
  '안국',
  '종로3가',
  '을지로3가',
  '충무로',
  '동대입구',
  '약수',
  '금호',
  '옥수',
  '압구정',
  '신사',
  '잠원',
  '고속터미널',
  '교대',
  '남부터미널',
  '양재',
  '매봉',
  '도곡',
  '대치',
  '학여울',
  '대청',
  '일원',
  '수서',
  '가락시장',
  '경찰병원',
  '오금',
];

/** 한글 역명 → slug. 매핑 누락 시 즉시 에러로 알린다. */
const slugOf = (koName: string): string => {
  const info = stationInfo[koName];
  if (!info) throw new Error(`stationInfo 에 '${koName}' 매핑이 없습니다.`);
  return info.slug;
};

async function main() {
  // 1) 노선
  for (const line of lines) {
    await prisma.line.upsert({
      where: { id: line.id },
      update: {
        name: line.name,
        nameEn: line.nameEn,
        color: line.color,
        priority: line.priority,
      },
      create: line,
    });
  }

  // 2) 역 (slug 를 id 로, 환승역은 자동 dedup)
  const allKoNames = new Set<string>([...line2Stations, ...line3Stations]);
  for (const koName of allKoNames) {
    const { slug, en } = stationInfo[koName] ?? {};
    if (!slug) throw new Error(`stationInfo 에 '${koName}' 매핑이 없습니다.`);
    await prisma.station.upsert({
      where: { id: slug },
      update: { name: koName, nameEn: en },
      create: { id: slug, name: koName, nameEn: en },
    });
  }

  // 3) 역↔노선 연결 (대표 노선은 Line.priority 로 파생되므로 순서 무관)
  const link = async (koName: string, lineId: string) => {
    const stationId = slugOf(koName);
    await prisma.stationLine.upsert({
      where: { stationId_lineId: { stationId, lineId } },
      update: {},
      create: { stationId, lineId },
    });
  };

  for (const koName of line2Stations) await link(koName, 'line-2');
  for (const koName of line3Stations) await link(koName, 'line-3');

  // 4) 옛 id 체계(한글) 등 현재 시드에 없는 잔재 정리
  const validSlugs = Object.values(stationInfo).map((i) => i.slug);
  const validLineIds = lines.map((l) => l.id);
  await prisma.stationLine.deleteMany({
    where: {
      OR: [
        { stationId: { notIn: validSlugs } },
        { lineId: { notIn: validLineIds } },
      ],
    },
  });
  await prisma.station.deleteMany({ where: { id: { notIn: validSlugs } } });
  await prisma.line.deleteMany({ where: { id: { notIn: validLineIds } } });

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
