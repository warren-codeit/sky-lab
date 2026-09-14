// habitability.js — 거주가능영역(HZ)·평형온도·판정 (순수 함수)
// HZ 경계: Kopparapu et al. 2013 보수 경계, 태양 기준 0.99~1.67 AU
//   (안쪽 moist greenhouse, 바깥 maximum greenhouse — Wikipedia "Circumstellar habitable zone" 인용 확인 2026-07-02)
//   항성 광도 스케일링: d = d☉ × √(L/L☉)  (T_eff 보정 생략 — 태양 유사 항성 근사, UI 툴팁에 명기)
// 평형온도: T_eq = [ L(1−A) / (16π σ d²) ]^¼, A=0.3 — 검산: 태양-지구 ≈ 255 K

export const AU = 1.495978707e11;      // m (IAU 2012 정의)
export const L_SUN = 3.828e26;         // W (IAU 2015 nominal)
export const SIGMA = 5.670374419e-8;   // W m⁻² K⁻⁴

export function hzBounds(L) {
  const s = Math.sqrt(L / L_SUN);
  return { inner: 0.99 * s * AU, outer: 1.67 * s * AU };
}

export function equilibriumTemp(L, d, albedo = 0.3) {
  return Math.pow((L * (1 - albedo)) / (16 * Math.PI * SIGMA * d * d), 0.25);
}

// Roche 한계 (유체 근사): d = 2.44 · R1 · (ρ1/ρ2)^(1/3)
export function rocheLimit(R1, rho1, rho2) {
  return 2.44 * R1 * Math.cbrt(rho1 / rho2);
}

// 상태 → 판정. state: { collision, escaped, L?, rPeri, rApo }
export function verdict(state) {
  if (state.collision) return { key: "collision", label: "충돌" };
  if (state.escaped) return { key: "escape", label: "탈출" };
  if (!state.L) return { key: "stable", label: "안정 궤도" };
  const { inner, outer } = hzBounds(state.L);
  const { rPeri, rApo } = state;
  if (rApo < inner) return { key: "hot", label: "찜통 (HZ 안쪽)" };
  if (rPeri > outer) return { key: "cold", label: "동결 (HZ 바깥)" };
  if (rPeri >= inner && rApo <= outer) return { key: "habitable", label: "거주가능" };
  return { key: "edge", label: "경계 (계절 극단)" };
}
