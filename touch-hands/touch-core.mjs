// Geometry and gesture rules shared by the page and its regression checks.
export const BUILD_VERSION = 'mobile71';
export const MODEL_CONFIG = [
  {id:'COLOR', label:'色の作品へ', name:'bottle', size:25, x:0, y:27, phase:0},
  {id:'SURFACE', label:'表面の作品へ', name:'frientirip', size:26, x:22, y:0, phase:Math.PI/2},
  {id:'HAND', label:'手の作品へ', name:'hand', size:27, x:0, y:-27, phase:Math.PI},
  {id:'SPACE', label:'宇宙と手の作品へ', name:'jisakuhand', size:28, x:-22, y:0, phase:Math.PI*1.5},
];
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function fitCamera(width, height) {
  // Bound all model spheres, floating movement and the maximum allowed tilt.
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const tan = Math.tan(50 * Math.PI / 360);
  const padding = Math.min(24, width * 0.06);
  const horizontal = 35 / (tan * aspect * (1 - 2 * padding / width));
  const vertical = 46 / (tan * (1 - 2 * padding / height));
  return Math.max(horizontal, vertical) + 23;
}
export function createGesture() {
  let state = null;
  return {
    start(id, x, y, time = 0) {
      if (state) { state.cancelled = true; return false; }
      state = {id, x, y, prevX:x, prevY:y, time, moved:false, cancelled:false};
      return true;
    },
    move(id, x, y) {
      if (!state || state.id !== id || state.cancelled) return null;
      const wasMoved = state.moved;
      if (Math.hypot(x-state.x, y-state.y) > 8) state.moved = true;
      const result = {dx:x-state.prevX, dy:y-state.prevY, moved:state.moved, firstMove:!wasMoved && state.moved};
      state.prevX=x; state.prevY=y;
      return result;
    },
    end(id, x, y, time = 0) {
      if (!state || state.id !== id) return false;
      const tap = !state.cancelled && !state.moved && Math.hypot(x-state.x,y-state.y)<=8 && time-state.time<650;
      state=null;
      return tap;
    },
    cancel() { state=null; },
    get active() { return state!==null; },
  };
}
export function advanceRotation(rotation, velocity, dt) {
  // Integrate exponential damping analytically: identical at 30/60/120 Hz.
  const decay=Math.exp(-4*dt), travel=(1-decay)/4;
  return {rotation:clamp(rotation+velocity*travel,-0.28,0.28), velocity:velocity*decay};
}
export const workURL = id => `../experience-prototype/?work=${encodeURIComponent(id)}&v=${BUILD_VERSION}`;
