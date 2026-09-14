// ephemeris.js — 순수 천문 계산 (DOM·three.js 의존 없음)
// 출처: Jean Meeus, Astronomical Algorithms 2nd ed. (장 번호는 주석에 표기)
// 규약: 입력 시각은 UTC 밀리초(Unix epoch) 또는 JD. 각도 반환은 라디안.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

const TAU = Math.PI * 2;

export function normRad(a) {
  a %= TAU;
  return a < 0 ? a + TAU : a;
}

// ── Julian Date ─────────────────────────────────────────────
// 1970-01-01T00:00Z = JD 2440587.5
export function jdFromMillis(ms) {
  return ms / 86400000 + 2440587.5;
}

export function millisFromJd(jd) {
  return (jd - 2440587.5) * 86400000;
}

// 율리우스 세기 (J2000 기준)
export function centuriesFromJd(jd) {
  return (jd - 2451545.0) / 36525;
}

// ── GMST / LST (Meeus ch.12, eq.12.4) ───────────────────────
// 반환: 라디안
export function gmst(jd) {
  const T = centuriesFromJd(jd);
  const deg =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return normRad(deg * DEG);
}

// lonRad: 동경 +
export function lst(jd, lonRad) {
  return normRad(gmst(jd) + lonRad);
}

// ── 태양 위치 (Meeus ch.25 저정밀, 정확도 ~0.01°) ────────────
// 반환: { ra, dec, lambda } (겉보기, 라디안)
export function sunEquatorial(jd) {
  const T = centuriesFromJd(jd);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T; // 기하 평균 황경 (deg)
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG; // 평균 근점이각
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M); // 중심차 (deg)
  const trueLon = L0 + C;
  const Omega = (125.04 - 1934.136 * T) * DEG;
  const lambda = (trueLon - 0.00569 - 0.00478 * Math.sin(Omega)) * DEG; // 겉보기 황경
  // 황도경사 (Meeus 22.2 절단) + 겉보기용 장동 보정
  const eps = (23.4392911 - 0.0130042 * T + 0.00256 * Math.cos(Omega)) * DEG;
  const sinL = Math.sin(lambda);
  const ra = normRad(Math.atan2(Math.cos(eps) * sinL, Math.cos(lambda)));
  const dec = Math.asin(Math.sin(eps) * sinL);
  return { ra, dec, lambda: normRad(lambda) };
}

// ── 행성 위치 (JPL "Approximate Positions of the Planets", 1800–2050) ──
// 출처: JPL SSD https://ssd.jpl.nasa.gov/planets/approx_pos.html (Table 1, Keplerian 요소 + 세기당 변화율)
// 요소 순서 [a(au), e, I(deg), L(deg), ϖ(deg), Ω(deg)]; 두 번째 배열은 세기(Cy)당 변화율.
const PLANET_EL = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
            [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
            [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
            [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
            [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
            [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
            [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
            [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
            [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
};
export const PLANET_KEYS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"];
const OBLIQ_J2000 = 23.43928 * DEG;   // JPL 명시 평균 황도경사

// 요소 → J2000 황도면 일심 직교좌표 [x,y,z] (au). Kepler 방정식은 라디안으로 반복해.
function heliocentric(el, T, out) {
  const a = el[0][0] + el[1][0] * T;
  const e = el[0][1] + el[1][1] * T;
  const I = (el[0][2] + el[1][2] * T) * DEG;
  const L = (el[0][3] + el[1][3] * T) * DEG;
  const wbar = (el[0][4] + el[1][4] * T) * DEG;   // ϖ (근일점 황경)
  const Om = (el[0][5] + el[1][5] * T) * DEG;
  const w = wbar - Om;                             // 근점인수
  let M = normRad(L - wbar);
  if (M > Math.PI) M -= TAU;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 12; k++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
  out[0] = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  out[1] = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  out[2] = (sw * sI) * xp + (cw * sI) * yp;
  return out;
}

// 지심 겉보기 적도좌표 { ra, dec, dist(au) } (J2000). 정확도 ~수 arcmin (naked-eye 충분).
const _eh = [0, 0, 0], _ph = [0, 0, 0];
export function planetEquatorial(jd, key) {
  const T = centuriesFromJd(jd);
  heliocentric(PLANET_EL.earth, T, _eh);
  heliocentric(PLANET_EL[key], T, _ph);
  const xe = _ph[0] - _eh[0], ye = _ph[1] - _eh[1], ze = _ph[2] - _eh[2];   // 지심 황도
  const ce = Math.cos(OBLIQ_J2000), se = Math.sin(OBLIQ_J2000);
  const xq = xe, yq = ce * ye - se * ze, zq = se * ye + ce * ze;            // 황도 → 적도
  const dist = Math.sqrt(xq * xq + yq * yq + zq * zq);
  return { ra: normRad(Math.atan2(yq, xq)), dec: Math.asin(zq / dist), dist };
}

// ── 달 위치 (Paul Schlyter 저정밀, 주요 섭동항 포함, ~2 arcmin) ──
// 출처: Paul Schlyter, "Computing planetary positions" https://stjarnhimlen.se/comp/ppcomp.html §4·§12
// 반환: 지심 적도좌표 { ra, dec, dist(지구반지름 단위) }
export function moonEquatorial(jd) {
  const d = jd - 2451543.5;                 // Schlyter epoch: 1999-12-31 0:00 UT
  // 달 궤도요소
  const N = (125.1228 - 0.0529538083 * d) * DEG;
  const i = 5.1454 * DEG;
  const w = (318.0634 + 0.1643573223 * d) * DEG;
  const a = 60.2666;                          // 지구반지름
  const e = 0.054900;
  let M = normRad((115.3654 + 13.0649929509 * d) * DEG);
  // 태양 요소 (섭동용)
  const Ms = normRad((356.0470 + 0.9856002585 * d) * DEG);
  const ws = (282.9404 + 0.0000470935 * d) * DEG;
  const Ls = normRad(ws + Ms);               // 태양 평균황경
  const Lm = normRad(N + w + M);             // 달 평균황경
  const D = normRad(Lm - Ls);                // 이각
  const F = normRad(Lm - N);                 // 위도인수
  // 이심근점이각
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let k = 0; k < 8; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);
  // 궤도면 → 황도 직교
  const xh = r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i));
  const yh = r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i));
  const zh = r * Math.sin(v + w) * Math.sin(i);
  let lon = Math.atan2(yh, xh);
  let lat = Math.atan2(zh, Math.hypot(xh, yh));
  // 주요 섭동 (도 단위, Schlyter §12)
  lon += (-1.274 * Math.sin(M - 2 * D) + 0.658 * Math.sin(2 * D) - 0.186 * Math.sin(Ms)
        - 0.059 * Math.sin(2 * M - 2 * D) - 0.057 * Math.sin(M - 2 * D + Ms)
        + 0.053 * Math.sin(M + 2 * D) + 0.046 * Math.sin(2 * D - Ms)
        + 0.041 * Math.sin(M - Ms) - 0.035 * Math.sin(D)
        - 0.031 * Math.sin(M + Ms) - 0.015 * Math.sin(2 * F - 2 * D)
        + 0.011 * Math.sin(M - 4 * D)) * DEG;
  lat += (-0.173 * Math.sin(F - 2 * D) - 0.055 * Math.sin(M - F - 2 * D)
        - 0.046 * Math.sin(M + F - 2 * D) + 0.033 * Math.sin(F + 2 * D)
        + 0.017 * Math.sin(2 * M + F)) * DEG;
  const rp = r - 0.58 * Math.cos(M - 2 * D) - 0.46 * Math.cos(2 * D);
  // 황도 → 적도
  const cl = Math.cos(lat);
  const xg = rp * cl * Math.cos(lon), yg = rp * cl * Math.sin(lon), zg = rp * Math.sin(lat);
  const ce = Math.cos(OBLIQ_J2000), se = Math.sin(OBLIQ_J2000);
  const xq = xg, yq = ce * yg - se * zg, zq = se * yg + ce * zg;
  const dist = Math.sqrt(xq * xq + yq * yq + zq * zq);
  return { ra: normRad(Math.atan2(yq, xq)), dec: Math.asin(zq / dist), dist };
}

// ── 적도 → 지평 (Meeus ch.13, 방위각은 북 기준 시계방향) ─────
// 반환: { alt, az }
export function equatorialToHorizontal(ra, dec, latRad, lstRad) {
  const H = lstRad - ra; // 시간각 (서쪽 +)
  const sinAlt =
    Math.sin(latRad) * Math.sin(dec) +
    Math.cos(latRad) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt)));
  const az = normRad(
    Math.atan2(
      -Math.cos(dec) * Math.sin(H),
      Math.cos(latRad) * Math.sin(dec) -
        Math.sin(latRad) * Math.cos(dec) * Math.cos(H)
    )
  );
  return { alt, az };
}

// ── 씬 좌표 (three.js 프레임: +X=동, +Y=천정, +Z=남) ─────────
// 천구 그룹 트릭(tiltGroup.rotation.x=φ−π/2, spinGroup.rotation.y=−LST)의
// 합성 회전을 전개한 닫힌 식. 트레일 폴리라인이 직접 사용.
export function equatorialToScene(ra, dec, latRad, lstRad, radius, out) {
  const H = lstRad - ra;
  const cosDec = Math.cos(dec);
  const sinDec = Math.sin(dec);
  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  out[0] = -cosDec * Math.sin(H) * radius;
  out[1] = (sinLat * sinDec + cosLat * cosDec * Math.cos(H)) * radius;
  out[2] = (sinLat * cosDec * Math.cos(H) - cosLat * sinDec) * radius;
  return out;
}

// spinGroup 로컬 배치용: (α,δ) → 단위 벡터 [cosδ sinα, sinδ, cosδ cosα]
export function equatorialToLocal(ra, dec, radius, out) {
  const cosDec = Math.cos(dec);
  out[0] = cosDec * Math.sin(ra) * radius;
  out[1] = Math.sin(dec) * radius;
  out[2] = cosDec * Math.cos(ra) * radius;
  return out;
}
