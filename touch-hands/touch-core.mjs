// Geometry and gesture rules shared by the page and its regression checks.
export const BUILD_VERSION = 'mobile75';
export const ASSET_VERSION = 'mobile71';
export const MODEL_CONFIG = [
  {id:'COLOR', label:'色の作品へ', name:'bottle', size:50, x:0, y:17.55, phase:0},
  {id:'SURFACE', label:'表面の作品へ', name:'frientirip', size:52, x:14.3, y:0, phase:Math.PI/2},
  {id:'HAND', label:'手の作品へ', name:'hand', size:54, x:0, y:-17.55, phase:Math.PI},
  {id:'SPACE', label:'宇宙と手の作品へ', name:'jisakuhand', size:56, x:-14.3, y:0, phase:Math.PI*1.5},
];
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
// Bounding spheres measured from the normalized GLBs, allowing every rotation.
export const MODEL_RADII = [27.75,35.25,42.55,31.75];
function anchors(width,height){
  if(width>height)return [[-.35,.16],[-.115,-.16],[.115,.16],[.35,-.16]].map(([x,y])=>[x*width,y*height]);
  return [[-.16,.35],[.16,.115],[-.16,-.115],[.16,-.35]].map(([x,y])=>[x*width,y*height]);
}
export function fitCamera(width,height){
  const w=Math.max(width,1),h=Math.max(height,1),points=anchors(w,h);
  const jitter=Math.hypot(w*.025,h*.012),gap=14;
  const focal=h/(2*Math.tan(50*Math.PI/360));
  // Keep the enlarged appearance where space permits; reserve each moving silhouette.
  let pixels=Math.min(w,h)*.00665;
  points.forEach(([x,y],i)=>{
    pixels=Math.min(pixels,(w/2-Math.abs(x)-w*.025-gap)/MODEL_RADII[i],(h/2-Math.abs(y)-h*.012-gap)/MODEL_RADII[i]);
    for(let j=0;j<i;j++)pixels=Math.min(pixels,(Math.hypot(x-points[j][0],y-points[j][1])-2*jitter-gap)/(MODEL_RADII[i]+MODEL_RADII[j]));
  });
  // A perspective sphere projects slightly larger than its center-plane radius.
  return focal/Math.max(.05,pixels)+50;
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
  const decay=Math.exp(-1.5*dt), travel=(1-decay)/1.5;
  return {rotation:rotation+velocity*travel, velocity:velocity*decay};
}
export const workURL = id => `../experience-prototype/?work=${encodeURIComponent(id)}&v=${BUILD_VERSION}`;

export function floatingPose(config,time,reduced=false,width=390,height=744){
  const i=MODEL_CONFIG.findIndex(item=>item.id===config.id),[x,y]=anchors(width,height)[i];
  const t=reduced?0:time,p=config.phase;
  return {
    x:x+(reduced?0:Math.sin(t*.29+p)*width*.025),
    y:y+(reduced?0:Math.sin(t*.37+p*1.3)*height*.012),
    z:reduced?0:Math.sin(t*.31+p)*5,
    rx:t*(.24+p*.014),
    ry:t*(.42+p*.018),
    rz:reduced?0:Math.sin(t*.32+p)*.32,
  };
}
