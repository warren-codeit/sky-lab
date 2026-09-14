#!/usr/bin/env node
// test-presets.mjs — 프리셋 sanity: 파생 주기 2π√(a³/μ) vs 문헌 주기 (오차 >2% FAIL)
// + T_eq 검산(태양-지구 ≈255K), HZ 경계 검산
import { PRESETS } from "../assets/js/astro/presets.js";
import { G } from "../assets/js/astro/nbody.js";
import { hzBounds, equilibriumTemp, AU, L_SUN } from "../assets/js/astro/habitability.js";

let fails = 0;
for (const p of PRESETS) {
  if (!p.litPeriodDays) { console.log(`SKIP  ${p.label} (문헌 주기 없음)`); continue; }
  const [b1, b2] = p.bodies;
  const mu = G * (b1.m + b2.m);
  const a = p.r0 / (2 - p.f0 * p.f0); // 접선 발사: a = r0/(2−f²)
  const T = (2 * Math.PI * Math.sqrt(a ** 3 / mu)) / 86400;
  const err = Math.abs(T - p.litPeriodDays) / p.litPeriodDays;
  const ok = err <= 0.02;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${p.label}: 파생 ${T.toFixed(3)}일 vs 문헌 ${p.litPeriodDays}일 (오차 ${(err * 100).toFixed(2)}%)`);
}
// T_eq 검산
const teq = equilibriumTemp(L_SUN, AU);
console.log(`${Math.abs(teq - 255) < 3 ? "PASS" : "FAIL"}  T_eq(태양, 1AU, A=0.3) = ${teq.toFixed(1)} K (기대 ≈255)`);
if (Math.abs(teq - 255) >= 3) fails++;
// HZ 검산 (태양)
const hz = hzBounds(L_SUN);
const okHz = Math.abs(hz.inner / AU - 0.99) < 1e-9 && Math.abs(hz.outer / AU - 1.67) < 1e-9;
console.log(`${okHz ? "PASS" : "FAIL"}  HZ(태양) = ${(hz.inner / AU).toFixed(2)}~${(hz.outer / AU).toFixed(2)} AU`);
if (!okHz) fails++;
process.exit(fails ? 1 : 0);
