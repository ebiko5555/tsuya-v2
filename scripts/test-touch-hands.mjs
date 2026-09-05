import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createGesture,advanceRotation,fitCamera,MODEL_RADII,MODEL_CONFIG,BUILD_VERSION,ASSET_VERSION,floatingPose,workURL} from '../touch-hands/touch-core.mjs';

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
test('enlarged moving silhouettes remain separated and inside portrait and landscape screens',()=>{
 for(const [w,h] of [[320,468],[390,744],[430,832],[844,326],[1440,800]]){
  const d=fitCamera(w,h),f=h/(2*Math.tan(50*Math.PI/360));
  for(let t=0;t<=120;t+=.25){
   const circles=MODEL_CONFIG.map((c,i)=>{
    const p=floatingPose(c,t,false,w,h),r=MODEL_RADII[i];
    // Conservative projected sphere radius, including off-axis perspective.
    const z=d-p.z,worldOffset=Math.hypot(p.x,p.y)*z/f;
    const radius=f*r*Math.sqrt(z*z+worldOffset*worldOffset-r*r)/(z*z-r*r);
    assert.ok(Math.abs(p.x)+radius<w/2-10&&Math.abs(p.y)+radius<h/2-10);
    return {...p,radius};
   });
   circles.forEach((c,i)=>circles.slice(0,i).forEach(b=>assert.ok(Math.hypot(c.x-b.x,c.y-b.y)>c.radius+b.radius+8)));
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

test('each model floats independently and keeps full rotation and drag inertia',()=>{
 for(const config of MODEL_CONFIG){
  const positions=Array.from({length:481},(_,i)=>floatingPose(config,i*.25));
  assert.ok(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))>18);
  assert.ok(Math.max(...positions.map(p=>p.z))-Math.min(...positions.map(p=>p.z))>9);
  assert.ok(positions.at(-1).rx>Math.PI*2&&positions.at(-1).ry>Math.PI*2);
  assert.deepEqual(floatingPose(config,100,true),floatingPose(config,0,true));
 }
 assert.ok(advanceRotation(7,1,1).rotation>7);
});
test('HOME, the root entry and the retired glyph URL all lead to the four models',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const root=read('../index.html'),old=read('../top-prototype/index.html'),work=read('../experience-prototype/index.html');
 assert.ok(root.includes("location.replace('touch-hands/?v="+BUILD_VERSION+"')"));
 assert.ok(old.includes("location.replace('../touch-hands/?v="+BUILD_VERSION+"')"));
 assert.ok(!old.includes('id="glyph"'));
 assert.ok(work.includes("document.getElementById('siteHome').href='../touch-hands/?v='+BUILD_VERSION"));
 assert.ok(!work.includes('../top-prototype/'));
 for(const config of MODEL_CONFIG)assert.ok(fs.existsSync(new URL('../touch-hands/assets/'+ASSET_VERSION+'/'+config.name+'.glb',import.meta.url)));
});
