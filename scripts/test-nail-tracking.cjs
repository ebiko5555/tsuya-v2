const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createTracker,smoothNail,createTrailSampler}=require('../experience-prototype/tracking-core.js');
const frame=x=>[Array.from({length:21},(_,i)=>({x:x+i*.001,y:.5+i*.001,z:0}))];

test('small held movements converge instead of remaining in a dead zone',()=>{
 const t=createTracker();t.update(frame(.5),0);
 for(let i=1;i<100;i++)t.update(frame(.502),i*1000/30);
 assert.ok(Math.abs(t.project(3300)[0][0].x-.502)<1e-6);
});
test('latency compensation follows a moving hand without amplifying stationary jitter',()=>{
 const tracker=createTracker();let sum=0,count=0;
 for(let i=0;i<90;i++){
  const at=i*1000/30;tracker.update(frame(.3+.15*at/1000),at);
  if(i>20){sum+=Math.abs(tracker.project(at+30)[0][0].x-(.3+.15*(at+30)/1000));count++;}
 }
 assert.ok(sum/count<.0015);
 const still=createTracker(),samples=[];
 for(let i=0;i<180;i++){const at=i*1000/30;still.update(frame(.5+Math.sin(i*2.2)*.0015),at);if(i>30)samples.push(still.project(at+30)[0][0].x);}
 assert.ok(Math.max(...samples)-Math.min(...samples)<.002);
});
test('stopping, reversing and reacquiring do not extrapolate an old hand',()=>{
 const t=createTracker();for(let i=0;i<30;i++)t.update(frame(.3+i*.005),i*1000/30);
 t.update(frame(.445),1000);assert.ok(Math.abs(t.project(1030)[0][0].x-.445)<.001);
 t.update(frame(.44),1033);assert.ok(t.project(1063)[0][0].x<=.446);
 assert.deepEqual(t.project(1300),[]);
 t.update(frame(.7),1350);assert.equal(t.project(1380)[0][0].x,.7);
 t.reset();assert.deepEqual(t.project(1400),[]);
});
test('out of order results cannot move nails backward in time',()=>{
 const t=createTracker();t.update(frame(.5),100);t.update(frame(.7),90);
 assert.equal(t.project(110)[0][0].x,.5);
});
test('nail rotation takes the short route across the angle boundary and settles',()=>{
 let s={len:40,ang:Math.PI-.01};
 s=smoothNail(s,40,-Math.PI+.01,1/60);assert.ok(Math.abs(s.ang-(Math.PI-.01))<.03);
 for(let i=0;i<120;i++)s=smoothNail(s,40.2,-Math.PI+.02,1/60);
 assert.ok(Math.abs(s.len-40.2)<1e-6);
 assert.ok(Math.abs(Math.atan2(Math.sin(s.ang-(-Math.PI+.02)),Math.cos(s.ang-(-Math.PI+.02))))<1e-6);
});
test('five stationary fingertips emit no trail; movement is sparse and stops immediately',()=>{
 const s=createTrailSampler();let points=0;
 for(let i=0;i<100;i++)for(let finger=0;finger<5;finger++)if(s.sample(finger,100+finger*40,200,i*1000/60))points++;
 assert.equal(points,0);
 let moving=0;for(let i=100;i<160;i++)for(let f=0;f<5;f++)if(s.sample(f,100+f*40+(i-100)*2,200,i*1000/60))moving++;
 assert.ok(moving>0&&moving<=120);
 for(let i=160;i<190;i++)for(let f=0;f<5;f++)assert.equal(s.sample(f,100+f*40+59*2,200,i*1000/60),null);
 s.reset();assert.equal(s.sample(0,100,200,4000),null);
});
test('a gap or sudden detection jump does not draw a streak across the image',()=>{
 const s=createTrailSampler();s.sample(0,0,0,0);
 assert.equal(s.sample(0,300,0,50),null);
 assert.equal(s.sample(0,350,0,500),null);
});
const html=fs.readFileSync(require.resolve('../experience-prototype/index.html'),'utf8');
test('actual draw function uses reduced glow and a short-lived sparkle',()=>{
 let calls=0,strokes=0,maxAlpha=0;
 const context={save(){},restore(){},beginPath(){},arc(){},fill(){calls++;},moveTo(){},lineTo(){},stroke(){strokes++;},createRadialGradient(){return {addColorStop(){}};}};
 const code=html.slice(html.indexOf('function drawTrails(){'),html.indexOf("document.querySelectorAll('.swatch')",html.indexOf('function drawTrails(){')));
 const sandbox={ctx:context,trailOn:true,trailIntensity:48,trails:[{x:30,y:40,born:0,color:'#e8b8bb',fi:0}],TRAIL_LIFE:560,performance:{now:()=>160},shade:x=>x,hexA:(color,a)=>{maxAlpha=Math.max(maxAlpha,a);return color;}};
 vm.createContext(sandbox);vm.runInContext(code+'\ndrawTrails();',sandbox);
 assert.equal(calls,1);assert.equal(strokes,1);assert.ok(maxAlpha<.35);
 sandbox.performance.now=()=>570;vm.runInContext('drawTrails();',sandbox);assert.equal(calls,1);
});
test('all ten artwork presets restore a restrained trail and no late override hides it',()=>{
 const presets=[...html.matchAll(/trail:\{on:(true|false),intensity:(\d+),hue:/g)];
 assert.equal(presets.length,10);presets.forEach(p=>{assert.equal(p[1],'true');assert.ok(+p[2]>=40&&+p[2]<=60);});
 assert.ok(!html.includes('drawTrails=function'));
 assert.ok(html.indexOf('tracking-core.js?v=mobile73')<html.indexOf('TsuyaTracking.createTracker()'));
 assert.ok(html.includes('pendingTrackingSession!==trackingSession'));
});

test('a slow but freshly received inference still displays the hand without extrapolating it',()=>{
 const t=createTracker();t.update(frame(.5),0,200);
 assert.equal(t.project(230)[0][0].x,.5);
 assert.deepEqual(t.project(350),[]);
});
