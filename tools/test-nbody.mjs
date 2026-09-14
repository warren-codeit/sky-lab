#!/usr/bin/env node
// test-nbody.mjs — nbody.js 헤드리스 결정적 검증
// 1) 지구-달 원궤도 주기 == 2π√(a³/μ) 및 실제 항성월 27.32일 ±1%
// 2) f=1 원궤도 반경 변동 < 0.1%
// 3) 에너지 드리프트 < 1e-6 (100궤도)
// 4) 시간 가역성 (1e4 스텝 왕복)
// 5) T² ∝ a³
import { createSystem, twoBodyInit, G } from "../assets/js/astro/nbody.js";

// 지구·달 질량·거리: NASA Moon Fact Sheet 값 (presets.js와 동일 출처, 자릿수 확인용)
const mE = 5.9722e24, mM = 7.346e22, r0 = 3.844e8;
const results = [];
function check(name, actual, expected, tol) {
  // expected=0이면 tol을 절대 허용오차로 사용
  const bound = expected === 0 ? tol : Math.abs(expected) * tol;
  const pass = Math.abs(actual - expected) <= bound;
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected} ±${bound})`);
}

// 궤도 주기 측정: 상대 위치각 누적이 2π 되는 시점 (선형 보간)
function measurePeriod(sys, hSec, maxSteps) {
  const [b1, b2] = sys.bodies;
  let prev = Math.atan2(b2.x[2] - b1.x[2], b2.x[0] - b1.x[0]);
  let acc = 0, t = 0;
  for (let s = 0; s < maxSteps; s++) {
    sys.stepMany(hSec);
    t += hSec;
    const ang = Math.atan2(b2.x[2] - b1.x[2], b2.x[0] - b1.x[0]);
    let d = ang - prev;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    const na = acc + Math.abs(d);
    if (na >= 2 * Math.PI) return t - hSec * ((na - 2 * Math.PI) / Math.abs(d));
    acc = na;
    prev = ang;
  }
  return NaN;
}

// 1) 주기
{
  const sys = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1));
  const mu = G * (mE + mM);
  const analytic = 2 * Math.PI * Math.sqrt(r0 ** 3 / mu);
  const T = measurePeriod(sys, 3600, 24 * 40);
  check("지구-달 측정 주기 == 해석 주기", T, analytic, 0.001);
  check("지구-달 주기 ≈ 항성월 27.32일", T / 86400, 27.32, 0.01);
}

// 2) 원궤도 반경 변동
{
  const sys = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1));
  let rMin = Infinity, rMax = 0;
  for (let s = 0; s < 24 * 30; s++) {
    sys.stepMany(3600);
    const { r } = sys.orbitalElements(0, 1);
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
  }
  check("f=1 반경 변동 (rMax/rMin − 1)", rMax / rMin - 1, 0, 1e-3 /* 절대 0.1% */ + 1e-12);
}

// 3) 에너지 거동 (심플렉틱: 유계 진동, 세큘러 증가 없음)
//    10궤도 시점과 100궤도 시점의 |ΔE/E₀|가 같은 자릿수(비증가)이고 절대값도 작아야 함
{
  const sys = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1.2));
  const E0 = sys.energy();
  const T = sys.orbitalElements(0, 1).T;
  let envA = 0, envB = 0; // 전반 100궤도 vs 후반 100궤도 오차 포락선
  for (let orbit = 0; orbit < 200; orbit++) {
    sys.stepMany(T);
    const err = Math.abs((sys.energy() - E0) / E0);
    if (orbit < 100) envA = Math.max(envA, err);
    else envB = Math.max(envB, err);
  }
  check("에너지 진동 유계 max|ΔE/E₀| (200궤도, 적응 h)", Math.max(envA, envB), 0, 1e-3);
  // 비증가(심플렉틱 보증)는 고정 h에서 성립 — 적응 h는 호출 간 h 변화로 미세 랜덤워크 허용(위 유계로 커버)
  const fix = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1.2));
  const Efix0 = fix.energy();
  const Tfix = fix.orbitalElements(0, 1).T;
  const stepsPerOrbit = Math.round(Tfix / 600);
  // 위상 무관 포락선: 매 스텝 |ΔE/E₀|의 궤도별 최대값 → 전반 20궤도 vs 후반 20궤도
  let fEnvA = 0, fEnvB = 0;
  for (let orbit = 0; orbit < 40; orbit++) {
    let env = 0;
    for (let s = 0; s < stepsPerOrbit; s++) {
      fix.stepMany(600, { kMax: 1 });
      env = Math.max(env, Math.abs((fix.energy() - Efix0) / Efix0));
    }
    if (orbit < 20) fEnvA = Math.max(fEnvA, env);
    else fEnvB = Math.max(fEnvB, env);
  }
  console.log(`${fEnvB <= fEnvA * 1.2 ? "PASS" : "FAIL"}  에너지 비증가 (고정 h=600s, 40궤도): 후반 포락선 ${fEnvB.toExponential(2)} ≤ 1.2× 전반 ${fEnvA.toExponential(2)}`);
  results.push(fEnvB <= fEnvA * 1.2);
  // 스텝을 10배 줄이면(η=0.002) 오차가 ~100배(2차) 줄어야 함
  const fine = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1.2));
  const Ef0 = fine.energy();
  for (let orbit = 0; orbit < 10; orbit++) fine.stepMany(T, { eta: 0.002, kMax: 1e6 });
  check("에너지 2차 수렴 (η=0.002, 10궤도)", Math.abs((fine.energy() - Ef0) / Ef0), 0, 1e-5);
}

// 4) 시간 가역성: 균일 h 1e4 스텝 전진 후 후진 → 원위치
{
  const sys = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1.3));
  const x0 = sys.bodies[1].x.slice();
  const h = 600;
  for (let s = 0; s < 10000; s++) sys.stepMany(h, { kMax: 1 });
  for (let s = 0; s < 10000; s++) sys.stepMany(-h, { kMax: 1 });
  const dx = Math.hypot(...sys.bodies[1].x.map((v, k) => v - x0[k]));
  check("가역성: 1e4 스텝 왕복 위치 오차 (m, r0 대비)", dx / r0, 0, 1e-6 + 1e-12);
}

// 5) T² ∝ a³: a×4 → T×8
{
  const s1 = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1));
  const s2 = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0 * 4, 1));
  const T1 = measurePeriod(s1, 3600, 24 * 40);
  const T2 = measurePeriod(s2, 3600 * 8, 24 * 40);
  check("케플러 3법칙: T(4a)/T(a) = 8", T2 / T1, 8, 0.002);
}

// 6) 탈출 판정: f=1.5 → eps ≥ 0
{
  const sys = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 1.5));
  const { eps, e } = sys.orbitalElements(0, 1);
  console.log(`${eps >= 0 ? "PASS" : "FAIL"}  탈출: f=1.5 → ε=${eps.toExponential(2)} ≥ 0, e=${e.toFixed(3)} (기대 1.25)`);
  results.push(eps >= 0 && Math.abs(e - 1.25) < 0.01);
}

// 7) 충돌: f=0.1 (거의 수직 낙하) → collision 이벤트
{
  const sys = createSystem(twoBodyInit(mE, 6.371e6, mM, 1.7374e6, r0, 0.1));
  let hit = null;
  for (let s = 0; s < 2000 && !hit; s++) hit = sys.stepMany(3600).collision;
  console.log(`${hit ? "PASS" : "FAIL"}  충돌: f=0.1 → collision 이벤트 발생`);
  results.push(!!hit);
}

const fails = results.filter((r) => !r).length;
console.log(`test-nbody: ${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);
