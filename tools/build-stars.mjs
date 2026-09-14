#!/usr/bin/env node
// build-stars.mjs — HYG CSV → assets/js/astro/stars-data.js 변환 (구현 시 1회 실행)
// 사용: node tools/build-stars.mjs <hyg.csv 경로>
//
// 데이터 출처: HYG Database v4.2 (astronexus) — https://codeberg.org/astronexus/hyg
//   파일: data/hyg/CURRENT/hyg_v42.csv.gz (Codeberg media 엔드포인트, git-lfs)
//   라이선스: CC BY-SA 4.0 (v4.x — repo README 확인, 2026-07-02)
// 스팟체크 기준값 (J2000, Wikipedia infobox 인용 확인 2026-07-02):
//   Sirius  RA 06h45m08.917s   Dec −16°42′58.02″  → 101.28715°, −16.71612°
//   Vega    RA 18h36m56.33635s Dec +38°47′01.2802″ → 279.23473°, +38.78369°
//   Polaris RA 02h31m49.09s    Dec +89°15′50.8″   → 37.95454°, +89.26411°
// 실패 시 빌드 중단 — 별 좌표를 기억으로 지어내지 않는다.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAD = 180 / Math.PI;
const MAG_CUT = 6.5;

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("사용법: node tools/build-stars.mjs <hyg.csv>");
  process.exit(1);
}

// ── CSV 파싱 (따옴표 필드 대응) ─────────────────────────────
function parseLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const raw = readFileSync(csvPath, "utf8");
const lines = raw.split("\n");
const header = parseLine(lines[0].trim());
const col = Object.fromEntries(header.map((h, i) => [h, i]));
for (const need of ["id", "proper", "ra", "rarad", "decrad", "mag", "ci"]) {
  if (!(need in col)) {
    console.error(`FAIL: 컬럼 '${need}' 없음 — 헤더: ${header.join(",")}`);
    process.exit(1);
  }
}

// ── 필터·수집 ───────────────────────────────────────────────
const stars = []; // {raRad, decRad, mag, bv, proper}
let unitCheckMax = 0, unitChecked = 0;
for (let li = 1; li < lines.length; li++) {
  const line = lines[li];
  if (!line || !line.trim()) continue;
  const f = parseLine(line);
  if (f[col.id] === "0") continue; // 태양 제외
  const mag = parseFloat(f[col.mag]);
  const raRad = parseFloat(f[col.rarad]);
  const decRad = parseFloat(f[col.decrad]);
  if (!isFinite(mag) || !isFinite(raRad) || !isFinite(decRad)) continue;
  // 단위 내부 일관성: ra(시간)×15 == rarad×RAD (파싱·단위 버그 가드)
  if (unitChecked < 200) {
    const raHours = parseFloat(f[col.ra]);
    if (isFinite(raHours)) {
      unitCheckMax = Math.max(unitCheckMax, Math.abs(raHours * 15 - raRad * RAD));
      unitChecked++;
    }
  }
  if (mag > MAG_CUT) continue;
  const bv = parseFloat(f[col.ci]);
  stars.push({
    raRad, decRad, mag,
    bv: isFinite(bv) ? bv : 0.5,
    proper: (f[col.proper] || "").trim(),
  });
}
stars.sort((a, b) => a.mag - b.mag); // 밝은 순

console.log(`필터 결과: mag ≤ ${MAG_CUT} → ${stars.length}개 (전체 ${lines.length - 1}행)`);
if (unitCheckMax > 1e-3) {
  console.error(`FAIL: ra×15 vs rarad 불일치 최대 ${unitCheckMax}°`);
  process.exit(1);
}
console.log(`단위 일관성: ra×15 vs rarad 최대 오차 ${unitCheckMax.toExponential(2)}° (${unitChecked}개 표본) PASS`);

// ── 스팟체크 (기준값 출처: 파일 상단 주석) ──────────────────
const REF = [
  { name: "Sirius", ra: 101.28715, dec: -16.71612 },
  { name: "Vega", ra: 279.23473, dec: 38.78369 },
  { name: "Polaris", ra: 37.95454, dec: 89.26411 },
];
let spotFail = false;
for (const r of REF) {
  const s = stars.find((x) => x.proper === r.name);
  if (!s) { console.error(`FAIL: '${r.name}' 미발견`); spotFail = true; continue; }
  const dRa = Math.abs(s.raRad * RAD - r.ra) * Math.cos(s.decRad); // 극 근처 RA 오차는 cos δ 가중
  const dDec = Math.abs(s.decRad * RAD - r.dec);
  const ok = dRa <= 0.1 && dDec <= 0.1;
  console.log(`${ok ? "PASS" : "FAIL"}: ${r.name} ΔRA·cosδ=${dRa.toFixed(4)}° ΔDec=${dDec.toFixed(4)}° (mag ${s.mag})`);
  if (!ok) spotFail = true;
}
if (spotFail) process.exit(1);

// ── 이름 붙일 별: mag ≤ 1.5 + Polaris (proper 있는 것만) ─────
const named = [];
stars.forEach((s, idx) => {
  if (s.proper && (s.mag <= 1.5 || s.proper === "Polaris")) {
    named.push({ name: s.proper, idx });
  }
});
console.log(`이름 표시 별: ${named.length}개 — ${named.map((n) => n.name).join(", ")}`);

// ── 출력 ────────────────────────────────────────────────────
const flat = [];
for (const s of stars) {
  flat.push(
    +s.raRad.toFixed(6), +s.decRad.toFixed(6),
    +s.mag.toFixed(2), +s.bv.toFixed(2)
  );
}
const out = `// stars-data.js — 실측 별 데이터 (tools/build-stars.mjs가 생성, 직접 수정 금지)
// 출처: HYG Database v4.2 — https://codeberg.org/astronexus/hyg (data/hyg/CURRENT/hyg_v42.csv.gz)
// 라이선스: CC BY-SA 4.0 — 페이지 푸터에 표기 의무
// 필터: mag ≤ ${MAG_CUT} (태양 제외), 밝은 순 정렬. 포맷: [raRad, decRad, mag, B−V] × N
// 스팟체크 PASS: Sirius·Vega·Polaris vs Wikipedia J2000 infobox (2026-07-02, 허용 0.1°)
export const STAR_COUNT = ${stars.length};
export const STARS = new Float32Array(${JSON.stringify(flat)});
export const NAMED_STARS = ${JSON.stringify(named)};
`;
const dest = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/js/astro/stars-data.js"
);
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`작성 완료: ${dest} (${(out.length / 1024).toFixed(0)} KB)`);
