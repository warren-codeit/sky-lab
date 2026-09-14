// orbit-camera.js — 커스텀 궤도 카메라 (r160 코어만 사용, 애드온 없음)
// 좌드래그 회전, 휠 로그 줌, 우클릭(또는 shift) 드래그 팬
export function createOrbitCamera(THREE, camera, dom, opts = {}) {
  const s = {
    theta: opts.theta ?? 0.6,          // 방위각
    phi: opts.phi ?? 0.42,             // 고도각 (0=수평)
    dist: opts.dist ?? 12,
    minDist: opts.minDist ?? 1.5,
    maxDist: opts.maxDist ?? 400,
    target: new THREE.Vector3(0, 0, 0),
  };
  let mode = null, px = 0, py = 0;

  dom.addEventListener("pointerdown", (e) => {
    mode = e.button === 2 || e.shiftKey ? "pan" : "rot";
    px = e.clientX; py = e.clientY;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener("pointermove", (e) => {
    if (!mode) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    if (mode === "rot") {
      s.theta -= dx * 0.005;
      s.phi = Math.min(1.53, Math.max(-1.53, s.phi + dy * 0.005));
    } else {
      const k = s.dist * 0.0016;
      const right = new THREE.Vector3(Math.cos(s.theta), 0, -Math.sin(s.theta));
      const fwd = new THREE.Vector3(-Math.sin(s.theta), 0, -Math.cos(s.theta));
      s.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k);
    }
  });
  dom.addEventListener("pointerup", () => (mode = null));
  dom.addEventListener("contextmenu", (e) => e.preventDefault());
  dom.addEventListener("wheel", (e) => {
    e.preventDefault();
    s.dist = Math.min(s.maxDist, Math.max(s.minDist, s.dist * Math.exp(e.deltaY * 0.0012)));
  }, { passive: false });

  return {
    state: s,
    setView({ dist, theta, phi, maxDist } = {}) {
      if (dist !== undefined) s.dist = dist;
      if (theta !== undefined) s.theta = theta;
      if (phi !== undefined) s.phi = phi;
      if (maxDist !== undefined) s.maxDist = maxDist;
      s.target.set(0, 0, 0);
    },
    update() {
      const cp = Math.cos(s.phi), sp = Math.sin(s.phi);
      camera.position.set(
        s.target.x + s.dist * cp * Math.sin(s.theta),
        s.target.y + s.dist * sp,
        s.target.z + s.dist * cp * Math.cos(s.theta)
      );
      camera.lookAt(s.target);
    },
  };
}
