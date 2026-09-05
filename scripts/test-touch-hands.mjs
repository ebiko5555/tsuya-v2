import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createGesture,advanceRotation,fitCamera,MODEL_CONFIG,BUILD_VERSION,workURL} from '../touch-hands/touch-core.mjs';

test('a small touch selects, but a drag returning to its origin never selects',()=>{
 const g=createGesture();g.start(1,50,50,0);g.move(1,53,52);assert.equal(g.end(1,53,52,120),true);
 g.start(1,50,50,0);g.move(1,100,50);g.move(1,50,50);assert.equal(g.end(1,50,50,200),false);
});
test('cancelled, long, and multi-pointer touches cannot navigate',()=>{
 const g=createGesture();g.start(1,0,0);g.cancel();assert.equal(g.end(1,0,0,100),false);
 g.start(1,0,0);assert.equal(g.start(2,0,0),false);assert.equal(g.end(1,0,0,100),false);
 g.start(1,0,0);assert.equal(g.end(2,0,0,100),false);assert.equal(g.end(1,0,0,900),false);
 g.start(1,0,0);assert.equal(g.end(1,12,0,100),false);
});
test('inertia has the same distance and speed at 30, 60 and 120 Hz',()=>{
 const simulate=hz=>{let r=0,v=.7;for(let i=0;i<hz;i++){const next=advanceRotation(r,v,1/hz);r=next.rotation;v=next.velocity;}return [r,v];};
 const a=simulate(30);for(const hz of [60,120])simulate(hz).forEach((v,i)=>assert.ok(Math.abs(v-a[i])<1e-10));
});
const rotate=(v,x,y)=>{
 const p=[v[0],Math.cos(x)*v[1]-Math.sin(x)*v[2],Math.sin(x)*v[1]+Math.cos(x)*v[2]];
 return [Math.cos(y)*p[0]+Math.sin(y)*p[2],p[1],-Math.sin(y)*p[0]+Math.cos(y)*p[2]];
};
test('model bounds stay inside portrait and landscape stages at all allowed tilts',()=>{
 // Bounds measured from the delivered GLBs after normalization, including the wire hand depth.
 const dimensions=[[8.514,25,8.514],[14.363,26,18.843],[27,19.056,26.728],[11.443,28,9.584]];
 for(const [w,h] of [[320,468],[390,744],[430,832],[844,326],[1440,800]]){
  const z=fitCamera(w,h),tan=Math.tan(50*Math.PI/360);
  for(let i=0;i<4;i++)for(const rx of [-.22,0,.22])for(const ry of [-.28,0,.28])for(const ox of [-.07,.07])for(const oy of [-.16,.16])for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
   let p=rotate(dimensions[i].map((v,j)=>v*.5*[sx,sy,sz][j]),ox,oy);
   p[0]+=MODEL_CONFIG[i].x+Math.sign(MODEL_CONFIG[i].x)*.65;p[1]+=MODEL_CONFIG[i].y+Math.sign(MODEL_CONFIG[i].y)*.9;
   p=rotate(p,rx,ry);const scale=h/(2*tan*(z-p[2]));
   const px=w/2+p[0]*scale,py=h/2-p[1]*scale;
   assert.ok(px>=12&&px<=w-12&&py>=12&&py<=h-12,`${w}x${h} ${MODEL_CONFIG[i].id}: ${px},${py}`);
  }
 }
});
test('all four work routes and the application entry points use the current revision',()=>{
 const html=fs.readFileSync(new URL('../touch-hands/index.html',import.meta.url),'utf8');
 for(const config of MODEL_CONFIG){assert.ok(html.includes(workURL(config.id).replace('&','&amp;')));}
 for(const path of ['../index.html','../top-prototype/index.html','../experience-prototype/index.html']){
  const text=fs.readFileSync(new URL(path,import.meta.url),'utf8');assert.ok(text.includes(BUILD_VERSION));
 }
});
