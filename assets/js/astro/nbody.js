// nbody.js — 2~3체 중력 물리 코어 (three.js·DOM 의존 없음, SI 단위)
// 적분기: velocity Verlet (kick-drift-kick, 심플렉틱·시간 가역)
// G: CODATA 2018
export const G = 6.6743e-11;

// bodies: [{ m(kg), R(m), x:[x,y,z](m), v:[vx,vy,vz](m/s) }]
export function createSystem(bodies) {
  const n = bodies.length;
  const acc = bodies.map(() => [0, 0, 0]);

  function computeAcc() {
    for (let i = 0; i < n; i++) acc[i][0] = acc[i][1] = acc[i][2] = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const bi = bodies[i], bj = bodies[j];
        const dx = bj.x[0] - bi.x[0], dy = bj.x[1] - bi.x[1], dz = bj.x[2] - bi.x[2];
        const r2 = dx * dx + dy * dy + dz * dz;
        const r = Math.sqrt(r2);
        const s = G / (r2 * r);
        const si = s * bj.m, sj = s * bi.m;
        acc[i][0] += si * dx; acc[i][1] += si * dy; acc[i][2] += si * dz;
        acc[j][0] -= sj * dx; acc[j][1] -= sj * dy; acc[j][2] -= sj * dz;
      }
    }
  }

  function step(h) {
    // kick-drift-kick
    for (let i = 0; i < n; i++) {
      const b = bodies[i], a = acc[i];
      b.v[0] += a[0] * h * 0.5; b.v[1] += a[1] * h * 0.5; b.v[2] += a[2] * h * 0.5;
      b.x[0] += b.v[0] * h; b.x[1] += b.v[1] * h; b.x[2] += b.v[2] * h;
    }
    computeAcc();
    for (let i = 0; i < n; i++) {
      const b = bodies[i], a = acc[i];
      b.v[0] += a[0] * h * 0.5; b.v[1] += a[1] * h * 0.5; b.v[2] += a[2] * h * 0.5;
    }
  }

  // 적응 스텝 크기: 최근접 쌍 기준 h = η·√(r³/μ) (궤도당 ≈ 2π/η 스텝)
  function targetStep(eta) {
    let hMin = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const bi = bodies[i], bj = bodies[j];
        const dx = bj.x[0] - bi.x[0], dy = bj.x[1] - bi.x[1], dz = bj.x[2] - bi.x[2];
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const mu = G * (bi.m + bj.m);
        hMin = Math.min(hMin, eta * Math.sqrt((r * r * r) / mu));
      }
    }
    return hMin;
  }

  const sys = {
    bodies,
    // 질량·위치·속도를 외부에서 바꾼 뒤 반드시 호출 (KDK 첫 kick이 최신 가속도를 쓰도록)
    refresh: computeAcc,
    // simDtSec: 부호 있는 시뮬 초. 반환 { steps, clamped, advanced, collision }
    // collisionScale: 충돌 판정 반지름 배율 (표시용 과장 배율과 일치시켜 "화면상 닿는 순간" 판정)
    stepMany(simDtSec, { eta = 0.02, kMax = 20000, collisionScale = 1 } = {}) {
      if (simDtSec === 0) return { steps: 0, clamped: false, advanced: 0, collision: null };
      const sign = Math.sign(simDtSec);
      let total = Math.abs(simDtSec);
      const hT = targetStep(eta);
      let K = Math.ceil(total / hT);
      let clamped = false;
      if (K > kMax) { K = kMax; total = hT * kMax; clamped = true; }
      const h = (total / K) * sign;
      for (let s = 0; s < K; s++) {
        step(h);
        const c = sys.collisionPair(collisionScale);
        if (c) return { steps: s + 1, clamped, advanced: h * (s + 1), collision: c };
      }
      return { steps: K, clamped, advanced: h * K, collision: null };
    },
    collisionPair(scale = 1) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const bi = bodies[i], bj = bodies[j];
          const dx = bj.x[0] - bi.x[0], dy = bj.x[1] - bi.x[1], dz = bj.x[2] - bi.x[2];
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= (bi.R + bj.R) * scale) return [i, j];
        }
      }
      return null;
    },
    energy() {
      let E = 0;
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        E += 0.5 * b.m * (b.v[0] ** 2 + b.v[1] ** 2 + b.v[2] ** 2);
        for (let j = i + 1; j < n; j++) {
          const bj = bodies[j];
          const dx = bj.x[0] - b.x[0], dy = bj.x[1] - b.x[1], dz = bj.x[2] - b.x[2];
          E -= (G * b.m * bj.m) / Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
      }
      return E;
    },
    barycenter() {
      let M = 0; const c = [0, 0, 0];
      for (const b of bodies) {
        M += b.m;
        c[0] += b.m * b.x[0]; c[1] += b.m * b.x[1]; c[2] += b.m * b.x[2];
      }
      c[0] /= M; c[1] /= M; c[2] /= M;
      return c;
    },
    recenter() {
      let M = 0; const c = [0, 0, 0], p = [0, 0, 0];
      for (const b of bodies) {
        M += b.m;
        for (let k = 0; k < 3; k++) { c[k] += b.m * b.x[k]; p[k] += b.m * b.v[k]; }
      }
      for (const b of bodies)
        for (let k = 0; k < 3; k++) { b.x[k] -= c[k] / M; b.v[k] -= p[k] / M; }
    },
    // i-j 쌍의 2체 궤도 요소: { eps, a, e, T, r, vRel } (탈출: eps ≥ 0 → a·T는 Infinity)
    orbitalElements(i, j) {
      const bi = bodies[i], bj = bodies[j];
      const mu = G * (bi.m + bj.m);
      const rx = bj.x[0] - bi.x[0], ry = bj.x[1] - bi.x[1], rz = bj.x[2] - bi.x[2];
      const vx = bj.v[0] - bi.v[0], vy = bj.v[1] - bi.v[1], vz = bj.v[2] - bi.v[2];
      const r = Math.sqrt(rx * rx + ry * ry + rz * rz);
      const v2 = vx * vx + vy * vy + vz * vz;
      const eps = v2 / 2 - mu / r;
      const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx;
      const h2 = hx * hx + hy * hy + hz * hz;
      const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h2) / (mu * mu)));
      const a = eps < 0 ? -mu / (2 * eps) : Infinity;
      const T = eps < 0 ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : Infinity;
      return { eps, a, e, T, r, vRel: Math.sqrt(v2) };
    },
  };
  computeAcc();
  return sys;
}

// 두 천체를 barycenter 원점, 상대거리 r0, 접선속도 f×v_circ로 초기화한 bodies 배열 생성
// f=1 원궤도, f=√2 탈출. 접선 발사 시 e=|f²−1|
export function twoBodyInit(m1, R1, m2, R2, r0, f) {
  const M = m1 + m2;
  const vCirc = Math.sqrt((G * M) / r0);
  const vRel = vCirc * f;
  return [
    { m: m1, R: R1, x: [(-m2 / M) * r0, 0, 0], v: [0, 0, (m2 / M) * vRel] },
    { m: m2, R: R2, x: [(m1 / M) * r0, 0, 0], v: [0, 0, (-m1 / M) * vRel] },
  ];
}

export function circularVelocity(m1, m2, r0) {
  return Math.sqrt((G * (m1 + m2)) / r0);
}
