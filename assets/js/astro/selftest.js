// selftest.js — ephemeris 결정적 검증 (Meeus 알려진 값 + 불변식)
// node: `node assets/js/astro/selftest.js`
// 브라우저: sky.html?selftest=1 이 동적 import → 콘솔 PASS/FAIL
import {
  DEG, RAD, jdFromMillis, gmst, lst, sunEquatorial,
  planetEquatorial, moonEquatorial, PLANET_KEYS,
  equatorialToHorizontal, equatorialToScene, equatorialToLocal, normRad,
} from "./ephemeris.js";
import { MESSIER } from "./messier-data.js";

const results = [];
function check(name, actual, expected, tol) {
  const pass = Math.abs(actual - expected) <= tol;
  results.push({ name, pass, actual, expected, tol });
}

// 1. Julian Date
check("JD: 2000-01-01T12:00Z = 2451545.0",
  jdFromMillis(Date.UTC(2000, 0, 1, 12, 0, 0)), 2451545.0, 1e-9);
// Meeus 예제 7.a: 1957-10-04.81 UT → JD 2436116.31
check("JD: Meeus 7.a (1957-10-04.81)",
  jdFromMillis(Date.UTC(1957, 9, 4) + 0.81 * 86400000), 2436116.31, 1e-6);

// 2. GMST — Meeus 예제 12.b: 1987-04-10 19:21:00 UT → 128.7378734°
const jd12b = jdFromMillis(Date.UTC(1987, 3, 10, 19, 21, 0));
check("JD: Meeus 12.b (1987-04-10 19:21 UT)", jd12b, 2446896.30625, 1e-9);
check("GMST: Meeus 12.b = 128.73787°", gmst(jd12b) * RAD, 128.7378734, 0.001);

// 3. 태양 — Meeus 예제 25.a: JD 2448908.5 (1992-10-13.0 TD)
//    책 기준값(겉보기): α=198.38083°, δ=−7.78507° (허용 0.02° — 저정밀 알고리즘 여유)
{
  const s = sunEquatorial(2448908.5);
  check("Sun RA: Meeus 25.a", s.ra * RAD, 198.38083, 0.02);
  check("Sun Dec: Meeus 25.a", s.dec * RAD, -7.78507, 0.02);
}

// 3b. 구조 검증 (기준값 기억 오류와 독립): 2026 하지 무렵 태양 적위 최대 ≈ +23.437°
{
  let maxDec = -99, maxDay = 0;
  for (let d = 0; d < 365; d++) {
    const s = sunEquatorial(jdFromMillis(Date.UTC(2026, 0, 1, 12) + d * 86400000));
    if (s.dec * RAD > maxDec) { maxDec = s.dec * RAD; maxDay = d; }
  }
  check("Sun: 2026 최대 적위 ≈ 황도경사", maxDec, 23.437, 0.05);
  check("Sun: 최대 적위 날짜 ≈ 6/21 (day 171)", maxDay, 171, 2);
  // 춘분: 3/20 무렵 δ=0 통과
  const mar20 = sunEquatorial(jdFromMillis(Date.UTC(2026, 2, 20, 12)));
  check("Sun: 2026-03-20 적위 ≈ 0", mar20.dec * RAD, 0, 0.3);
}

// 4. 불변식: 천구 북극(δ=90°)의 고도 = 위도
{
  const phi = 37.5665 * DEG;
  const h = equatorialToHorizontal(1.234, Math.PI / 2, phi, 4.321);
  check("불변식: 북극점 고도 = 위도", h.alt, phi, 1e-9);
  check("불변식: 북극점 방위 = 북(0)", Math.sin(h.az), 0, 1e-9);
}

// 5. 하지 서울 남중 고도 ≈ 90 − 37.5665 + δ
{
  const phi = 37.5665 * DEG;
  const jdNoon = jdFromMillis(Date.UTC(2026, 5, 21, 3, 30)); // 서울 지방 정오 근처
  let best = -99;
  for (let m = -120; m <= 120; m += 2) {
    const jd = jdNoon + (m * 60000) / 86400000;
    const s = sunEquatorial(jd);
    const h = equatorialToHorizontal(s.ra, s.dec, phi, lst(jd, 126.978 * DEG));
    if (h.alt > best) best = h.alt;
  }
  check("하지 서울 남중고도 ≈ 75.87°", best * RAD, 90 - 37.5665 + 23.437, 0.5);
}

// 6. 씬 변환 일치: 합성 회전(Rx(φ−90°)·Ry(−LST)·local) == equatorialToScene 닫힌 식
{
  let maxErr = 0;
  let seed = 42;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 100; i++) {
    const ra = rand() * Math.PI * 2;
    const dec = (rand() - 0.5) * Math.PI * 0.98;
    const phi = (rand() - 0.5) * Math.PI * 0.98;
    const L = rand() * Math.PI * 2;
    const p = equatorialToLocal(ra, dec, 1, [0, 0, 0]);
    // Ry(−LST)
    const cy = Math.cos(-L), sy = Math.sin(-L);
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    const y1 = p[1];
    // Rx(φ−π/2)
    const ax = phi - Math.PI / 2;
    const cx = Math.cos(ax), sx = Math.sin(ax);
    const y2 = y1 * cx - z1 * sx;
    const z2 = y1 * sx + z1 * cx;
    const q = equatorialToScene(ra, dec, phi, L, 1, [0, 0, 0]);
    maxErr = Math.max(maxErr,
      Math.abs(x1 - q[0]), Math.abs(y2 - q[1]), Math.abs(z2 - q[2]));
    // 지평좌표 공식과도 일치: y성분 == sin(alt)
    const h = equatorialToHorizontal(ra, dec, phi, L);
    maxErr = Math.max(maxErr, Math.abs(Math.sin(h.alt) - q[1]));
  }
  check("씬 변환 일치 (합성회전 vs 닫힌 식, 100세트)", maxErr, 0, 1e-6);
}

// 7. 방위 sanity: 동쪽에서 뜨는 천체(H<0, δ=0, 지평선)는 방위 ≈ 90°(동)
{
  const h = equatorialToHorizontal(Math.PI / 2, 0, 37 * DEG, 0); // H = −90°
  check("방위 sanity: 적도 천체 H=−90° → 동쪽", h.az * RAD, 90, 1e-6);
}

// 8. 행성 (JPL 근사식): 지심거리 물리 경계 + 이각 경계 + 황도 근접 (여러 epoch)
{
  const DIST = { mercury: [0.53, 1.47], venus: [0.26, 1.75], mars: [0.37, 2.68],
    jupiter: [3.9, 6.5], saturn: [7.9, 11.1], uranus: [17, 21.2], neptune: [28.7, 31.4] };
  const ELONG_MAX = { mercury: 28.5, venus: 47.5 };
  const eclLatDeg = (ra, dec) => {   // 적도 → 황도 위도
    const xq = Math.cos(dec) * Math.cos(ra), yq = Math.cos(dec) * Math.sin(ra), zq = Math.sin(dec);
    const e = 23.43928 * DEG;
    return Math.asin(-Math.sin(e) * yq + Math.cos(e) * zq) * RAD;
  };
  const angsep = (a, b) => Math.acos(Math.min(1, Math.max(-1,
    Math.sin(a.dec) * Math.sin(b.dec) + Math.cos(a.dec) * Math.cos(b.dec) * Math.cos(a.ra - b.ra)))) * RAD;
  let distErr = 0, latMax = 0, elongMerc = 0, elongVen = 0;
  const jds = [2451545.0, jdFromMillis(Date.UTC(2010, 0, 1)), jdFromMillis(Date.UTC(2026, 6, 2)), jdFromMillis(Date.UTC(2040, 0, 1))];
  for (const jd of jds) {
    const sun = sunEquatorial(jd);
    for (const k of PLANET_KEYS) {
      const p = planetEquatorial(jd, k);
      if (p.dist < DIST[k][0] || p.dist > DIST[k][1]) distErr++;
      latMax = Math.max(latMax, Math.abs(eclLatDeg(p.ra, p.dec)));
      if (k === "mercury") elongMerc = Math.max(elongMerc, angsep(p, sun));
      if (k === "venus") elongVen = Math.max(elongVen, angsep(p, sun));
    }
  }
  check("행성: 지심거리 물리 경계 위반 수 = 0", distErr, 0, 0);
  check("행성: 황도 위도 최대 < 8° (황도 근접)", latMax, 0, 8);
  check("행성: 수성 최대이각 ≤ 28.5°", elongMerc, 0, 28.5);
  check("행성: 금성 최대이각 ≤ 47.5°", elongVen, 0, 47.5);
}

// 9. 달 (Schlyter): 지심거리(지구반지름) + 황도 위도 경계 + 월 운동
{
  const eclLat = (ra, dec) => {
    const xq = Math.cos(dec) * Math.cos(ra), yq = Math.cos(dec) * Math.sin(ra), zq = Math.sin(dec);
    const e = 23.43928 * DEG;
    return Math.asin(-Math.sin(e) * yq + Math.cos(e) * zq) * RAD;
  };
  let dMin = 999, dMax = 0, latMax = 0;
  const jd0 = jdFromMillis(Date.UTC(2026, 6, 2));
  for (let day = 0; day < 30; day++) {
    const m = moonEquatorial(jd0 + day);
    dMin = Math.min(dMin, m.dist); dMax = Math.max(dMax, m.dist);
    latMax = Math.max(latMax, Math.abs(eclLat(m.ra, m.dec)));
  }
  check("달: 근지점 거리 > 55 지구반지름", dMin, 57, 3);        // ~56–64 Re
  check("달: 원지점 거리 < 64 지구반지름", dMax, 61, 3);
  check("달: 황도 위도 최대 < 5.6°", latMax, 0, 5.6);
}

// 10. Messier 카탈로그 정합성 (좌표 범위 + 중복 없음 + 개수)
{
  let bad = 0;
  const ids = new Set();
  for (const m of MESSIER) {
    if (!(m.raH >= 0 && m.raH < 24)) bad++;
    if (!(m.decDeg >= -90 && m.decDeg <= 90)) bad++;
    if (ids.has(m.id)) bad++;
    ids.add(m.id);
  }
  check("Messier: 좌표 범위·중복 위반 = 0", bad, 0, 0);
  check("Messier: 개수 = 24", MESSIER.length, 24, 0);
}

// ── 리포트 ──────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass);
for (const r of results) {
  const line = `${r.pass ? "PASS" : "FAIL"}  ${r.name}  (got ${r.actual}, want ${r.expected} ±${r.tol})`;
  r.pass ? console.log(line) : console.error(line);
}
console.log(`selftest: ${results.length - failed.length}/${results.length} PASS`);
if (typeof process !== "undefined" && process.exit) process.exit(failed.length ? 1 : 0);
