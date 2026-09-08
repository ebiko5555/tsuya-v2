const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {smoothPose,createSession}=require('../experience-prototype/motion-lab-core.js');
const {stabilizeNail}=require('../experience-prototype/tracking-core.js');
const hands=x=>[Array.from({length:21},()=>({x,y:.5,z:0}))];
const target=(x=100,ang=0,len=40)=>({x,y:100,ang,len});
const makeCanvas=()=>({width:0,height:0,stamp:null,getContext(){return {drawImage:input=>{this.stamp=input.stamp;}};}});
const input={width:1280,height:720,stamp:'frame A'};

test('synchronized image remains the exact submitted frame while next inference is in flight',()=>{
 const s=createSession(makeCanvas),p=s.begin(input,0);s.finish(p.id,hands(.3),hands(.31),40);
 const q=s.begin({...input,stamp:'frame B'},45);
 assert.equal(s.select(55,{...input,stamp:'live C'},hands(.8)).image.stamp,'frame A');
 assert.equal(s.select(55,input,[]).landmarks[0][0].x,.3);
 s.finish(q.id,hands(.5),hands(.51),90);
 assert.equal(s.select(100,input,[]).image.stamp,'frame B');
 s.begin({...input,stamp:'frame D'},101);
 assert.equal(s.select(105,input,[]).image.stamp,'frame B');
});
test('the existing/latest combination uses the normal projected landmarks and live image',()=>{
 const s=createSession(makeCanvas);s.configure({timing:'latest',smoothing:'existing'});
 const projected=hands(.7),selected=s.select(20,input,projected);
 assert.equal(selected.image,input);assert.equal(selected.landmarks,projected);
 const before=target(),next=target(102);
 assert.deepEqual(s.pose(0,before,next,1/60,stabilizeNail),stabilizeNail(before,next,1/60));
});
test('a missing hand clears the synchronized overlay immediately; stale frames time out',()=>{
 const s=createSession(makeCanvas),a=s.begin(input,0);s.finish(a.id,hands(.5),hands(.5),30);
 const b=s.begin(input,34);s.finish(b.id,[],hands(.5),70);
 assert.deepEqual(s.select(71,input,hands(.8)).landmarks,[]);
 assert.equal(s.select(500,input,hands(.8)).image,input);
 assert.deepEqual(s.select(500,input,hands(.8)).landmarks,[]);
});
test('reset rejects in-flight old results after source changes and a replay wraps',()=>{
 const s=createSession(makeCanvas),old=s.begin(input,100);
 s.reset();const next=s.begin({...input,stamp:'new clip'},200);
 assert.equal(s.finish(old.id,hands(.1),hands(.1),220),false);
 assert.deepEqual(s.select(220,input,[]).landmarks,[]);
 assert.equal(s.finish(next.id,hands(.8),hands(.8),240),true);
 assert.equal(s.select(250,input,[]).image.stamp,'new clip');
});
test('a paired frame cannot acquire different nail positions on repeated display reads',()=>{
 const s=createSession(makeCanvas),a=s.begin(input,0);s.finish(a.id,hands(.5),hands(.5),30);
 const first=s.pose(0,null,target(),1/60,stabilizeNail);
 const b=s.begin(input,34);s.finish(b.id,hands(.6),hands(.6),65);
 const second=s.pose(0,first,target(110),1/60,stabilizeNail);
 for(let i=0;i<10;i++)assert.deepEqual(s.pose(0,second,target(110),1/120,stabilizeNail),second);
});
test('continuous poses respond to subpixel steps and settle without a persistent dead zone',()=>{
 let s=smoothPose(null,target(),1/60),before=s.x;
 for(let i=1;i<=180;i++){
  s=smoothPose(s,target(100+i*.04),1/60);
  assert.ok(s.x>before,'each small forward movement must propagate');before=s.x;
 }
 for(let i=0;i<180;i++)s=smoothPose(s,target(107.2),1/60);
 assert.ok(Math.abs(s.x-107.2)<1e-6);
});
test('continuous poses damp stationary jitter and wrap rotation by the short arc',()=>{
 let p=smoothPose(null,target(),1/60),out=[];
 for(let i=0;i<300;i++){p=smoothPose(p,target(100+Math.sin(i*2)*1.5),1/60);if(i>60)out.push(p.x);}
 assert.ok(Math.max(...out)-Math.min(...out)<1.5);
 p=smoothPose(null,target(100,Math.PI-.01),1/60);
 p=smoothPose(p,target(100,-Math.PI+.01),1/60);assert.ok(Math.abs(p.ang-Math.PI)<.02);
});
test('continuous poses stop and reverse without predicting beyond the target',()=>{
 for(const fps of [30,60,120]){
  let p=null;
  for(let i=0;i<fps;i++)p=smoothPose(p,target(100+i*120/fps),1/fps);
  const end=100+(fps-1)*120/fps;
  for(let i=0;i<fps;i++){p=smoothPose(p,target(end),1/fps);assert.ok(p.x<=end+1e-9);}
  const old=p.x;p=smoothPose(p,target(end-5),1/fps);assert.ok(p.x<old);
 }
});
test('malformed landmark results cannot poison the pose history',()=>{
 const s=createSession(makeCanvas),a=s.begin(input,0),bad=hands(.5);bad[0][7].x=NaN;
 s.finish(a.id,bad,bad,30);assert.deepEqual(s.select(40,input,[]).landmarks,[]);
});
test('repeated begin is bounded to one pending image and telemetry is measured',()=>{
 const s=createSession(makeCanvas),p=s.begin(input,0);assert.equal(s.begin(input,1),null);
 s.finish(p.id,hands(.4),hands(.4),40);s.tick(50);s.tick(70);s.tick(90);
 const stats=s.stats(95);assert.equal(stats.fps,50);assert.equal(stats.inferenceMs,40);assert.equal(stats.sampleAge,95);
});
test('all inline scripts and new browser modules parse',()=>{
 const html=fs.readFileSync(require.resolve('../experience-prototype/index.html'),'utf8');
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc=/.test(m[1]))new vm.Script(m[2]);
 for(const f of ['motion-lab-core.js','motion-lab.js'])new vm.Script(fs.readFileSync(require.resolve('../experience-prototype/'+f),'utf8'));
});
test('reacquisition after a long processing gap does not interpolate from a stale nail',()=>{
 const s=createSession(makeCanvas),a=s.begin(input,0);s.finish(a.id,hands(.2),hands(.2),30);
 s.pose(0,null,target(100),1/60,stabilizeNail);
 const b=s.begin(input,600);s.finish(b.id,hands(.8),hands(.8),630);
 assert.equal(s.pose(0,null,target(600),1/60,stabilizeNail).x,600);
});
