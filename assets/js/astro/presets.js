// presets.js — 궤도 샌드박스 프리셋 (값은 1차 출처 확인, 2026-07-02)
// 출처:
//   [JPL]  JPL SSD Planetary Physical Parameters — https://ssd.jpl.nasa.gov/planets/phys_par.html
//   [WPM]  Wikipedia: Moon infobox — https://en.wikipedia.org/wiki/Moon
//   [WPS]  Wikipedia: Sun infobox (IAU nominal) — https://en.wikipedia.org/wiki/Sun
//   [WPC]  Wikipedia: Charon infobox — https://en.wikipedia.org/wiki/Charon_(moon)
//   [WPI]  Wikipedia: Io infobox — https://en.wikipedia.org/wiki/Io_(moon)
//   [WPA]  Wikipedia: Alpha Centauri — https://en.wikipedia.org/wiki/Alpha_Centauri
// 로드 시 tools/test-presets.mjs 가 파생 주기 vs 문헌 주기(litPeriodDays)를 대조 (오차 >2% FAIL)

import { AU, L_SUN } from "./habitability.js";

const M_SUN = 1.988475e30;   // kg [WPS]
const R_SUN = 6.957e8;       // m  [WPS]

export const PRESETS = [
  {
    id: "earth-moon",
    label: "지구와 달",
    bodies: [
      { name: "지구", m: 5.97217e24, R: 6.3710084e6, color: 0x5f8fdc, spinH: 23.93, tex: "2k_earth_daymap.jpg" },  // [JPL]
      { name: "달",   m: 7.346e22,   R: 1.7374e6,   color: 0xb9b4a8, spinH: 655.7, tex: "2k_moon.jpg" },   // [WPM]
    ],
    r0: 3.84399e8, f0: 1,            // [WPM] semi-major axis (원궤도 시작)
    litPeriodDays: 27.321661,        // [WPM] 항성월
    exaggerate: 8, defaultSpeed: 86400, sunBg: true, showHZ: false,
  },
  {
    id: "pluto-charon",
    label: "명왕성과 카론",
    note: "무게중심이 명왕성 밖에 있는 쌍성형 계",
    bodies: [
      { name: "명왕성", m: 1.30246e22, R: 1.1883e6, color: 0xc9a887, spinH: 153.3, tex: "pluto.jpg" },   // [JPL]
      { name: "카론",   m: 1.5897e21,  R: 6.06e5,   color: 0x8d8d9a, spinH: 153.3, tex: "charon.jpg" },   // [WPC]
    ],
    r0: 1.9595764e7, f0: 1,          // [WPC]
    litPeriodDays: 6.387221,         // [WPC]
    exaggerate: 2.2, defaultSpeed: 21600, sunBg: false, showHZ: false,
  },
  {
    id: "jupiter-io",
    label: "목성과 이오",
    bodies: [
      { name: "목성", m: 1.898125e27, R: 6.9911e7, color: 0xd8a878, spinH: 9.93, tex: "2k_jupiter.jpg" },     // [JPL]
      { name: "이오", m: 8.931938e22, R: 1.8216e6, color: 0xe8d86a, spinH: 42.46, tex: "io.jpg" },    // [WPI]
    ],
    r0: 4.217e8, f0: 1,              // [WPI]
    litPeriodDays: 1.769137786,      // [WPI]
    exaggerate: 1.2, defaultSpeed: 7200, sunBg: false, showHZ: false,
  },
  {
    id: "jupiter-twins",
    label: "목성 쌍둥이 (가상)",
    note: "동질량 쌍 — 공통 무게중심을 서로 돈다",
    bodies: [
      { name: "목성 A", m: 1.898125e27, R: 6.9911e7, color: 0xd8a878, spinH: 9.93, tex: "2k_jupiter.jpg" },
      { name: "목성 B", m: 1.898125e27, R: 6.9911e7, color: 0x9ab8d8, spinH: 9.93, tex: "2k_jupiter.jpg", tint: 0x9ab8d8 },
    ],
    r0: 1.2e9, f0: 1,                // 가상 (충돌 없이 넉넉한 간격)
    litPeriodDays: null,
    exaggerate: 2.5, defaultSpeed: 43200, sunBg: false, showHZ: false,
  },
  {
    id: "sun-earth",
    label: "태양과 지구",
    bodies: [
      { name: "태양", m: M_SUN, R: R_SUN, color: 0xffd27a, spinH: 609.1, luminosity: L_SUN, star: true, tex: "2k_sun.jpg" },
      { name: "지구", m: 5.97217e24, R: 6.3710084e6, color: 0x5f8fdc, spinH: 23.93, tex: "2k_earth_daymap.jpg" },
    ],
    r0: AU, f0: 1,
    litPeriodDays: 365.256,          // 항성년
    exaggerate: 18, defaultSpeed: 1500000, sunBg: false, showHZ: true,
  },
  {
    id: "alphacen-ab",
    label: "알파 센타우리 A와 B (실제 쌍성)",
    note: "e≈0.52 타원 — 근점에서 시작",
    bodies: [
      { name: "α Cen A", m: 1.0788 * M_SUN, R: 1.2175 * R_SUN, color: 0xffe8b0, spinH: 528, luminosity: 1.5059 * L_SUN, star: true, tex: "2k_sun.jpg", tint: 0xfff0d0 },  // [WPA]
      { name: "α Cen B", m: 0.9092 * M_SUN, R: 0.8591 * R_SUN, color: 0xffc890, spinH: 864, luminosity: 0.4981 * L_SUN, star: true, tex: "2k_sun.jpg", tint: 0xffc890 },  // [WPA]
    ],
    // a=23.299 AU, e=0.51947 [WPA] → 근점 r0 = a(1−e), f0 = √(1+e)
    r0: 23.299 * (1 - 0.51947) * AU,
    f0: Math.sqrt(1 + 0.51947),
    litPeriodDays: 79.762 * 365.25,  // [WPA]
    exaggerate: 200, defaultSpeed: 5e7, sunBg: false, showHZ: false,
  },
  {
    id: "alphacen-earth",
    label: "α Cen A 주위의 지구",
    note: "동반성 B는 생략 (단순화). 거리 슬라이더로 HZ 안팎을 오가 보세요",
    bodies: [
      { name: "α Cen A", m: 1.0788 * M_SUN, R: 1.2175 * R_SUN, color: 0xffe8b0, spinH: 528, luminosity: 1.5059 * L_SUN, star: true, tex: "2k_sun.jpg", tint: 0xfff0d0 },
      { name: "지구", m: 5.97217e24, R: 6.3710084e6, color: 0x5f8fdc, spinH: 23.93, tex: "2k_earth_daymap.jpg" },
    ],
    r0: 1.4 * AU, f0: 1,             // HZ(≈1.21~2.05 AU) 안쪽에서 시작
    litPeriodDays: null,
    exaggerate: 20, defaultSpeed: 1500000, sunBg: false, showHZ: true,
  },
];
