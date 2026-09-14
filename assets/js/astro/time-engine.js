// time-engine.js — sky.html·orbits.html 공유 시간 엔진
// rAF는 호스트 페이지가 소유. 엔진은 advance(realDtMs)로 수동 진행.
// sky는 반환값 simTime(절대 UTC ms), orbits는 simDt(부호 있는 시뮬 초)를 사용.

export function createTimeEngine(initialMs, { rate = 1, direction = 1 } = {}) {
  let simTime = initialMs; // UTC ms
  let playing = false;
  let dir = direction; // +1 | -1
  let secPerSec = rate; // 시뮬 초 / 실제 초
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb(api);
  }

  const api = {
    // realDtMs: 실제 경과 ms. 반환 simDt는 "시뮬 초" (부호 포함, 정지 시 0)
    advance(realDtMs) {
      let simDt = 0;
      if (playing) {
        simDt = (realDtMs / 1000) * secPerSec * dir;
        simTime += simDt * 1000;
      }
      return { simTime, simDt };
    },
    play() {
      if (!playing) { playing = true; emit(); }
    },
    pause() {
      if (playing) { playing = false; emit(); }
    },
    toggle() {
      playing = !playing;
      emit();
    },
    isPlaying: () => playing,
    setDirection(d) {
      dir = d >= 0 ? 1 : -1;
      emit();
    },
    getDirection: () => dir,
    setRate(v) {
      secPerSec = v;
      emit();
    },
    getRate: () => secPerSec,
    setTime(ms) {
      simTime = ms;
      emit();
    },
    getTime: () => simTime,
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  return api;
}
