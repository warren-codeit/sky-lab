#!/usr/bin/env node
// test-loop.mjs — 렌더 프레임 루프의 핵심 체인을 결정적으로 검증
// (headless 가상시간은 rAF를 1~2회만 발화 → 애니메이션 검증 불가. 여기서 로직만 재현)
// 검증: engine.advance → stepMany 로 달이 실제로 공전하고, 트레일 샘플링 임계가 발화하는가
import { createSystem, twoBodyInit } from "../assets/js/astro/nbody.js";
import { createTimeEngine } from "../assets/js/astro/time-engine.js";

const mE = 5.97217e24, mM = 7.346e22, r0 = 3.84399e8;
const renderScale = 4 / r0;         // orbits.html과 동일
const sys = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1));
sys.recenter(); sys.refresh();
const engine = createTimeEngine(0, { rate: 86400 }); // 1일/초
engine.play();

let last = [1e99, 0, 0], samples = 0;
let prevAngle = Math.atan2(sys.bodies[1].x[2], sys.bodies[1].x[0]);
let swept = 0;      // 누적 부호 있는 스윕각 (증분 합산 → 방향·>π 대응)
let sweptSim = 0;
const FRAMES = 600, dtMs = 1000 / 60;   // 10초 실시간 = 10일 시뮬
for (let f = 0; f < FRAMES; f++) {
  const { simDt } = engine.advance(dtMs);
  sweptSim += simDt;
  sys.stepMany(simDt);
  const b = sys.bodies[1];
  let ang = Math.atan2(b.x[2], b.x[0]);
  let d = ang - prevAngle;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  swept += d;
  prevAngle = ang;
  // 트레일 샘플링 (orbits.html pushTrail 임계 0.03 렌더유닛 → 제곱 0.0009)
  const x = b.x[0] * renderScale, y = b.x[1] * renderScale, z = b.x[2] * renderScale;
  const dx = x - last[0], dy = y - last[1], dz = z - last[2];
  if (dx * dx + dy * dy + dz * dz >= 0.0009) { samples++; last = [x, y, z]; }
}
swept = Math.abs(swept);
const expectedFrac = sweptSim / 86400 / 27.32;   // 시뮬 경과일 / 주기

const checks = [
  ["시뮬 시간 진행 (10초 → ~10일)", Math.abs(sweptSim / 86400 - 10) < 0.05],
  ["달이 공전 (스윕각 > 0.2 rad)", swept > 0.2],
  ["스윕각 ≈ 예상 (경과/주기·2π)", Math.abs(swept - expectedFrac * 2 * Math.PI) < 0.05],
  ["트레일 샘플 누적 (> 50점)", samples > 50],
];
let fails = 0;
for (const [name, ok] of checks) { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); }
console.log(`swept=${swept.toFixed(3)}rad, 시뮬경과=${(sweptSim / 86400).toFixed(2)}일, 트레일샘플=${samples}`);
console.log(`test-loop: ${checks.length - fails}/${checks.length} PASS`);
process.exit(fails ? 1 : 0);
