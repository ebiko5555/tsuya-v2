// Geometry and gesture rules shared by the page and its regression checks.
export const BUILD_VERSION = 'mobile79';
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
export function fitCamera(width,height){
  const w=Math.max(width,1),h=Math.max(height,1);
  const padding=Math.min(20,w*.05,h*.05),tan=Math.tan(50*Math.PI/360);
  const halfAngle=Math.atan(Math.min(tan*(1-2*padding/h),tan*w/h*(1-2*padding/w)));
  return 66/Math.sin(halfAngle)*Math.max(1,1.8/(Math.max(w,h)/Math.min(w,h)));
}
// Screen-space billiards: each body travels freely until another body or an edge redirects it.
export function createFloatWorld(width,height){
  const focal=height/(2*Math.tan(50*Math.PI/360)),pixels=focal/fitCamera(width,height);
  const speed=Math.min(width,height)*.055;
  const starts=width<height?[[-.22,.18],[.22,.13],[-.20,-.16],[.21,-.20]]:[[-.34,.16],[-.12,-.16],[.13,.17],[.34,-.15]];
  const bodies=MODEL_CONFIG.map((c,i)=>({
    x:starts[i][0]*width,y:starts[i][1]*height,
    vx:Math.cos(.7+i*1.9)*speed,vy:Math.sin(.7+i*1.9)*speed,
    // Softer contact envelope lets the irregular silhouettes brush past one another.
    radius:MODEL_RADII[i]*pixels*.85+3,
    wallRadius:MODEL_RADII[i]*pixels*1.12+4,
  }));
  function walls(b){
    const bx=Math.max(0,width/2-b.wallRadius-8),by=Math.max(0,height/2-b.wallRadius-8);
    if(b.x>bx){b.x=bx;b.vx=-Math.abs(b.vx);}if(b.x< -bx){b.x=-bx;b.vx=Math.abs(b.vx);}
    if(b.y>by){b.y=by;b.vy=-Math.abs(b.vy);}if(b.y< -by){b.y=-by;b.vy=Math.abs(b.vy);}
  }
  function resolve(){
    for(let pass=0;pass<12;pass++){
      bodies.forEach(walls);
      for(let i=0;i<bodies.length;i++)for(let j=0;j<i;j++){
        const a=bodies[i],b=bodies[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),limit=a.radius+b.radius;
        if(d>=limit)continue;
        const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0;
        const ia=1/(a.radius*a.radius),ib=1/(b.radius*b.radius),sum=ia+ib;
        const overlap=limit-d+.001;
        a.x+=nx*overlap*ia/sum;a.y+=ny*overlap*ia/sum;
        b.x-=nx*overlap*ib/sum;b.y-=ny*overlap*ib/sum;
        const approaching=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
        if(approaching<0){
          const impulse=-2*approaching/sum;
          a.vx+=impulse*ia*nx;a.vy+=impulse*ia*ny;
          b.vx-=impulse*ib*nx;b.vy-=impulse*ib*ny;
        }
      }
    }
    bodies.forEach(walls);
  }
  for(let settle=0;settle<8;settle++)resolve();
  let accumulator=0;
  return {bodies,step(dt){
    accumulator+=Math.min(Math.max(dt,0),.1);
    while(accumulator>=1/120-1e-10){
      for(const b of bodies){b.x+=b.vx/120;b.y+=b.vy/120;}
      resolve();accumulator-=1/120;
    }
    return bodies;
  }};
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

export function floatingPose(config,time,reduced=false,width=390,height=744,body=null){
  const i=MODEL_CONFIG.findIndex(item=>item.id===config.id);
  const position=body??createFloatWorld(width,height).bodies[i];
  const t=reduced?0:time,p=config.phase;
  return {
    x:position.x,y:position.y,
    z:reduced?0:Math.sin(t*.31+p)*5,
    rx:t*(.24+p*.014),ry:t*(.42+p*.018),
    rz:reduced?0:Math.sin(t*.32+p)*.32,
  };
}
