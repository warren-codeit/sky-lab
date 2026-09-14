# Sky Lab — 천문 시뮬레이션 웹사이트

지상에서 본 하늘(`sky.html`)과 우주에서 본 궤도 역학(`orbits.html`) 두 페이지. 빌드 없는 단일 HTML + 공유 ES 모듈 구조 (poems.html 패턴).

## 실행

ES 모듈은 `file://`에서 CORS로 막히므로 로컬 서버 필요:

```bash
git clone https://github.com/warren-codeit/sky-lab.git
cd sky-lab
python3 -m http.server 8000
# http://localhost:8000/           (허브 — 두 페이지로 링크)
# http://localhost:8000/sky.html
# http://localhost:8000/orbits.html
```

## 두 페이지

### sky.html — 지상에서 보기
- 위도·경도·날짜를 고정하고 시간 재생/역재생/배속 (모드 A), 또는 시각을 고정하고 위경도·날짜를 스윕 (모드 B, 재생 시 날짜 1년 순환).
- 1인칭 시점: 드래그로 하늘 둘러보기, 휠로 FOV 줌.
- 궤적(트레일): 태양은 기본, 별은 클릭으로 최대 4개 선택. 해석적(±12h 경로 즉시 계산) 방식이라 파라미터를 바꾸면 실시간 갱신. additive 글로우 비드로 밝게 표시. "지나간 자취만" 토글로 현재 시각 이전만 표시.
- **별자리**: 88개 IAU 별자리 선(d3-celestial)을 별과 함께 회전 표시, 한국어 이름 라벨. "별자리"·"별자리 이름" 토글.
- 별: mag ≤ 6.5 (약 8,920개). 1등성 이름 라벨은 "별 이름" 토글.
- **행성·달**: 수성~해왕성 7행성(JPL 근사 궤도요소, 지심 겉보기 위치)과 달(Schlyter 저정밀)을 실시간 위치로 표시, 한국어 라벨. 낮에도 표시. "행성·달" 토글.
- **심우주(Messier)**: 유명 Messier 24개(은하·성운·성단)를 J2000 좌표에 유형별 색으로 표시, M-번호 라벨. 밤에만 표시. "심우주(M)" 토글.
- 하늘색은 태양 고도에 따라 밤↔박명↔낮으로 변하고, 별·별자리는 낮에 페이드("낮에도 별" 토글로 상시 표시).
- URL 파라미터: `?lat=&lon=&t=<ISO>&yaw=&pitch=&fov=&selftest=1`

### orbits.html — 우주에서 보기
- 두 천체의 상호 중력을 velocity Verlet(심플렉틱)로 적분. 질량은 실시간, 거리·속도는 "다시 발사" 방식(드래그 중 예상 궤도 프리뷰).
- 초기 속도는 원궤도 속도 배수 f (1.0=원, 1.41=탈출). 접선 발사 시 e=|f²−1|.
- **실사 텍스처**: 각 천체에 실측 사진 지도(지구 대륙·목성 띠·달/명왕성/이오 표면). 항성·가상 천체는 태양/목성 지도를 색조 변경해 재사용. 자전이 표면을 실제로 돌림.
- **천체 이름 라벨** + 무게중심 라벨 ("이름" 토글).
- **충돌 폭발**: 충돌 시 섬광·확산 충격파 링·파편 250개·카메라 흔들림 (자체 실시간 클록이라 정지 중에도 재생). 역재생으로 분리하면 사라짐.
- 판정: 충돌(실반지름 기준)·탈출(쌍곡선)·안정 궤도. 항성 프리셋은 거주가능영역(HZ) 링과 평형온도 T_eq, 거주가능/찜통/동결 판정.
- 프리셋: 지구-달, 명왕성-카론, 목성-이오, 목성 쌍둥이(가상), 태양-지구, α Cen A-B(실쌍성), α Cen A + 지구(HZ 체험).
- URL 파라미터: `?preset=<id>&f=&dist=<r0배수>&boom=1` (preset id는 presets.js 참조, boom은 폭발 데모)

## 파일 구조

```
index.html                     # 허브 (두 페이지로 링크)
sky.html, orbits.html          # 두 페이지 (인라인 CSS/JS)
assets/js/astro/
  ephemeris.js                 # JD·GMST/LST·태양·행성(JPL)·달(Schlyter)·좌표변환 (순수 함수)
  stars-data.js                # HYG v4.2에서 구운 별 8920개 (mag≤6.5, 생성물, 직접 수정 금지)
  constellations.js            # d3-celestial 88개 별자리 선·한국어 이름 (생성물)
  messier-data.js              # 유명 Messier 24개 (J2000 좌표, 수기 큐레이션)
  time-engine.js               # 공유 시간 엔진 (play/pause/reverse/rate)
  nbody.js                     # 2~3체 중력 (SI 단위, velocity Verlet)
  presets.js                   # 궤도 프리셋 (값·텍스처 출처 주석)
  habitability.js              # HZ 경계·T_eq·Roche·판정
  orbit-camera.js              # 궤도 카메라 (드래그 회전·휠 줌·팬)
  selftest.js                  # 천문 계산 검증 (?selftest=1 또는 node)
assets/textures/               # 실사 천체 지도 7개 (아래 라이선스 표)
tools/
  build-stars.mjs              # HYG CSV → stars-data.js (별 데이터 재생성 시)
  build-constellations.mjs     # d3-celestial JSON → constellations.js
  test-nbody.mjs               # 물리 검증
  test-presets.mjs             # 프리셋 주기·T_eq·HZ sanity
  test-loop.mjs                # 렌더 프레임 체인 검증
```

## 검증 (전부 결정적, node 실행)

```bash
node assets/js/astro/selftest.js   # 23/23 — Meeus 예제(GMST 128.73787°, 태양 25.a), 씬 변환 일치, 하지 서울 남중고도 75.87°, 행성 거리·이각·황도 경계, 달 거리·황위, Messier 정합성
node tools/test-nbody.mjs          # 10/10 — 지구-달 주기 27.28일, 에너지 유계 진동, 가역성, 케플러 3법칙, 탈출·충돌 판정
node tools/test-presets.mjs        # 파생 주기 vs 문헌(오차<2%), T_eq(태양1AU)=254.6K, HZ=0.99~1.67AU
node tools/test-loop.mjs           # 4/4 — 프레임 루프에서 달 공전·트레일 축적
```

추가 검증: `node tools/build-constellations.mjs`(89개·Orion/UMa·오리온 벨트 좌표 PASS), `build-stars.mjs`(8920개·Sirius/Vega/Polaris PASS).

브라우저 시각 확인(스크린샷) 완료: sky는 폴라리스 고도=위도, 오리온·큰개·황소 별자리 형태·한국어 이름 정상. orbits는 지구 대륙·목성 띠·명왕성 표면 텍스처, 이름 라벨, 밝은 궤적, 충돌 시 충격파+파편 폭발.

## 데이터 출처

- **별**: [HYG Database v4.2](https://codeberg.org/astronexus/hyg) (David Nash), CC BY-SA 4.0.
- **별자리 선·이름**: [d3-celestial](https://github.com/ofrohn/d3-celestial) (Olaf Frohn), BSD-3-Clause.
- **태양 위치**: Meeus, *Astronomical Algorithms* 2nd ed. (저정밀 ~0.01°).
- **행성 위치**: [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html) (Keplerian 요소 + 세기당 변화율, 1800–2050).
- **달 위치**: [Paul Schlyter, Computing planetary positions](https://stjarnhimlen.se/comp/ppcomp.html) (저정밀 + 주요 섭동항).
- **Messier**: [SEDS Messier Database](https://www.messier.seds.org/) · Wikipedia(IAU). J2000 좌표.
- **천체 물리량**: JPL SSD, Wikipedia(IAU nominal). presets.js 값마다 출처 주석.
- **HZ**: Kopparapu et al. 2013 보수 경계(0.99~1.67 AU, √L 스케일링).

### 텍스처 (assets/textures/) — 어트리뷰션 의무

| 파일 | 천체 | 출처 | 라이선스 |
|---|---|---|---|
| 2k_earth_daymap.jpg, 2k_moon.jpg, 2k_jupiter.jpg, 2k_sun.jpg | 지구·달·목성·태양 | [Solar System Scope](https://www.solarsystemscope.com/textures/) | CC BY 4.0 |
| pluto.jpg | 명왕성 | NASA/JHUAPL/SwRI New Horizons (Wikimedia) | Public Domain |
| charon.jpg | 카론 | NASA New Horizons (Wikimedia) | Public Domain |
| io.jpg | 이오 | USGS/NASA Galileo·Voyager (Wikimedia) | Public Domain |

항성(α Cen)·가상 목성 B는 2k_sun/2k_jupiter를 색조 변경해 재사용. 특정 지도 로드 실패 시 절차 캔버스 텍스처로 자동 fallback(콘솔 경고).

## 알려진 한계 (정직 표기)

- 행성 위치는 JPL 근사 궤도요소(1800–2050, ~수 arcmin), 달은 Schlyter 저정밀(~2 arcmin). 정밀 성식·엄폐 용도 아님. 행성 위상·고리·크기는 표현 안 함(색 원반만). 명왕성 등 왜소행성 제외.
- 대기 굴절 보정 없음(지평선 근처 최대 0.6° 오차).
- orbits는 점질량 역학: 자전·부피는 궤도에 영향 없이 시각 표현만(UI에 명시). 역재생은 적응 스텝이라 "시각적 되감기" 수준.
- headless 브라우저(가상시간)는 rAF를 1~2회만 발화 → 정적 스크린샷에 모션이 안 담김. 실제 브라우저는 정상(test-loop.mjs로 체인 검증).
