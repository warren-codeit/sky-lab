// messier-data.js — 유명 Messier 심우주 천체 (J2000 좌표, 수기 큐레이션)
// 출처: SEDS Messier Database (https://www.messier.seds.org/) · Wikipedia Messier infobox (IAU).
//   좌표는 J2000 적경(raH: 시)·적위(decDeg: 도), 등급(mag), 유형(type), 한/영 이름.
//   type: galaxy(은하) · nebula(발광성운) · planetary(행성상성운) · globular(구상성단) · open(산개성단)
// sky.html에서 raH*15°·decDeg를 라디안으로 변환해 배치 (별·별자리와 동일한 equatorialToLocal).

export const MESSIER = [
  { id: "M31",  ko: "안드로메다 은하",   en: "Andromeda Galaxy",  raH: 0.7123,  decDeg: 41.269,  mag: 3.4, type: "galaxy" },
  { id: "M33",  ko: "삼각형자리 은하",   en: "Triangulum Galaxy", raH: 1.5642,  decDeg: 30.660,  mag: 5.7, type: "galaxy" },
  { id: "M45",  ko: "플레이아데스",       en: "Pleiades",          raH: 3.7900,  decDeg: 24.117,  mag: 1.6, type: "open" },
  { id: "M1",   ko: "게 성운",            en: "Crab Nebula",       raH: 5.5755,  decDeg: 22.015,  mag: 8.4, type: "nebula" },
  { id: "M42",  ko: "오리온 대성운",      en: "Orion Nebula",      raH: 5.5881,  decDeg: -5.391,  mag: 4.0, type: "nebula" },
  { id: "M44",  ko: "프레세페 성단",      en: "Beehive Cluster",   raH: 8.6717,  decDeg: 19.667,  mag: 3.7, type: "open" },
  { id: "M81",  ko: "보데 은하",          en: "Bode's Galaxy",     raH: 9.9257,  decDeg: 69.065,  mag: 6.9, type: "galaxy" },
  { id: "M82",  ko: "시가 은하",          en: "Cigar Galaxy",      raH: 9.9308,  decDeg: 69.681,  mag: 8.4, type: "galaxy" },
  { id: "M104", ko: "솜브레로 은하",      en: "Sombrero Galaxy",   raH: 12.6664, decDeg: -11.623, mag: 8.0, type: "galaxy" },
  { id: "M87",  ko: "처녀자리 A",         en: "Virgo A",           raH: 12.5137, decDeg: 12.391,  mag: 8.6, type: "galaxy" },
  { id: "M51",  ko: "부자 은하",          en: "Whirlpool Galaxy",  raH: 13.4979, decDeg: 47.195,  mag: 8.4, type: "galaxy" },
  { id: "M3",   ko: "사냥개자리 구상성단", en: "M3 Globular",      raH: 13.7033, decDeg: 28.377,  mag: 6.2, type: "globular" },
  { id: "M13",  ko: "헤르쿨레스 구상성단", en: "Hercules Cluster", raH: 16.6949, decDeg: 36.461,  mag: 5.8, type: "globular" },
  { id: "M6",   ko: "나비 성단",          en: "Butterfly Cluster", raH: 17.6683, decDeg: -32.217, mag: 4.2, type: "open" },
  { id: "M7",   ko: "프톨레마이오스 성단", en: "Ptolemy Cluster",  raH: 17.8967, decDeg: -34.793, mag: 3.3, type: "open" },
  { id: "M20",  ko: "삼렬 성운",          en: "Trifid Nebula",     raH: 18.0428, decDeg: -23.030, mag: 6.3, type: "nebula" },
  { id: "M8",   ko: "석호 성운",          en: "Lagoon Nebula",     raH: 18.0606, decDeg: -24.383, mag: 6.0, type: "nebula" },
  { id: "M16",  ko: "독수리 성운",        en: "Eagle Nebula",      raH: 18.3128, decDeg: -13.807, mag: 6.0, type: "nebula" },
  { id: "M17",  ko: "오메가 성운",        en: "Omega Nebula",      raH: 18.3461, decDeg: -16.177, mag: 6.0, type: "nebula" },
  { id: "M22",  ko: "궁수자리 구상성단",   en: "Sagittarius Cluster", raH: 18.6067, decDeg: -23.904, mag: 5.1, type: "globular" },
  { id: "M11",  ko: "야생오리 성단",      en: "Wild Duck Cluster", raH: 18.8511, decDeg: -6.267,  mag: 5.8, type: "open" },
  { id: "M57",  ko: "고리 성운",          en: "Ring Nebula",       raH: 18.8933, decDeg: 33.029,  mag: 8.8, type: "planetary" },
  { id: "M27",  ko: "아령 성운",          en: "Dumbbell Nebula",   raH: 19.9936, decDeg: 22.721,  mag: 7.4, type: "planetary" },
  { id: "M15",  ko: "페가수스 구상성단",   en: "M15 Globular",     raH: 21.4997, decDeg: 12.167,  mag: 6.2, type: "globular" },
];
