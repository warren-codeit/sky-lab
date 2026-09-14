#!/usr/bin/env node
// build-constellations.mjs — d3-celestial → assets/js/astro/constellations.js
// 사용: node tools/build-constellations.mjs <lines.json> <names.json>
//
// 출처: d3-celestial (Olaf Frohn) — https://github.com/ofrohn/d3-celestial
//   data/constellations.lines.json + data/constellations.json, BSD-3-Clause
// 좌표: GeoJSON [lonDeg, decDeg], RA는 0..12h→0..180°, 12..24h→−180..0°
//   → raDeg = ((lon % 360) + 360) % 360, decDeg 그대로
// 이름(ko/la)·라벨 위치는 names.json의 properties·geometry에서. 별 좌표 join 불필요.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEG = Math.PI / 180;
const [, , linesPath, namesPath] = process.argv;
if (!linesPath || !namesPath) {
  console.error("사용법: node tools/build-constellations.mjs <lines.json> <names.json>");
  process.exit(1);
}
const lines = JSON.parse(readFileSync(linesPath, "utf8")).features;
const names = JSON.parse(readFileSync(namesPath, "utf8")).features;
const nameById = Object.fromEntries(names.map((f) => [f.id, f]));

const raRad = (lon) => (((lon % 360) + 360) % 360) * DEG;
const r6 = (x) => +x.toFixed(6);

const out = [];
for (const f of lines) {
  const nm = nameById[f.id];
  if (!nm) { console.error(`FAIL: 이름 없음 ${f.id}`); process.exit(1); }
  const polys = f.geometry.coordinates.map((line) =>
    line.map(([lon, dec]) => [r6(raRad(lon)), r6(dec * DEG)])
  );
  const [lLon, lDec] = nm.geometry.coordinates;
  out.push({
    id: f.id,
    rank: +(nm.properties.rank || f.properties.rank || 3),
    ko: nm.properties.ko || nm.properties.en,
    la: nm.properties.la || nm.properties.en,
    labelRa: r6(raRad(lLon)),
    labelDec: r6(lDec * DEG),
    lines: polys,
  });
}

// ── 스팟체크 (실패 시 중단) ─────────────────────────────────
let fail = false;
function assert(cond, msg) { if (!cond) { console.error("FAIL: " + msg); fail = true; } else console.log("PASS: " + msg); }

assert(out.length >= 88, `별자리 ${out.length}개 (≥88)`);
const ori = out.find((c) => c.id === "Ori");
const uma = out.find((c) => c.id === "UMa");
assert(ori && ori.ko === "오리온자리", `Orion 존재·한국어명 (${ori && ori.ko})`);
assert(uma && uma.ko === "큰곰자리", `Ursa Major 존재·한국어명 (${uma && uma.ko})`);

// 오리온 벨트: RA≈83~85°(5h32m~5h40m), Dec≈−2~+1° 부근 정점 존재
if (ori) {
  const RAD = 180 / Math.PI;
  let belt = false;
  for (const poly of ori.lines) for (const [ra, dec] of poly) {
    const raD = ra * RAD, decD = dec * RAD;
    if (raD > 81 && raD < 87 && decD > -3 && decD < 2) belt = true;
  }
  assert(belt, "오리온 벨트 정점(RA 81~87°, Dec −3~+2°) 존재");
}
// 북두칠성(UMa)은 북천 고위도: Dec>+45° 정점 다수
if (uma) {
  const RAD = 180 / Math.PI;
  let hi = 0;
  for (const poly of uma.lines) for (const [, dec] of poly) if (dec * RAD > 45) hi++;
  assert(hi >= 5, `Ursa Major 고위도(Dec>45°) 정점 ${hi}개 (≥5)`);
}
if (fail) process.exit(1);

// ── 출력 ────────────────────────────────────────────────────
const totalVerts = out.reduce((s, c) => s + c.lines.reduce((a, p) => a + p.length, 0), 0);
const body = `// constellations.js — IAU 별자리 선·이름 (tools/build-constellations.mjs 생성, 직접 수정 금지)
// 출처: d3-celestial (Olaf Frohn) — https://github.com/ofrohn/d3-celestial, BSD-3-Clause
// 88+ 별자리. 좌표 [raRad, decRad]. 이름 ko/la, 라벨 위치 labelRa/labelDec (라디안).
export const CONSTELLATIONS = ${JSON.stringify(out)};
`;
const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/js/astro/constellations.js");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, body);
console.log(`작성 완료: ${dest} — ${out.length}개 별자리, ${totalVerts} 정점, ${(body.length / 1024).toFixed(0)} KB`);
