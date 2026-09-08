const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createTracker,smoothNail,stabilizeNail,createTrailSampler}=require('../experience-prototype/tracking-core.js');
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
 assert.ok(moving>0&&moving<=150);
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
test('try-on gloss has no fixed diagonal haze and appears only when nail direction meets the light',()=>{
 const draw=html.slice(html.indexOf('function drawNails('),html.indexOf('function flatLook('));
 const gel=html.slice(html.indexOf('function paintGelTip('),html.indexOf('function nailShapeSpecimen('));
 assert.ok(draw.includes('const specStrength = Math.pow'));
 assert.ok(draw.includes('if(specAlpha>.018)'));
 assert.ok(!gel.includes('const shine=c.createLinearGradient'));
 assert.ok(!html.includes('const softbox = c.createLinearGradient'));
});
test('all ten artwork presets restore a restrained trail and no late override hides it',()=>{
 const presets=[...html.matchAll(/trail:\{on:(true|false),intensity:(\d+),hue:/g)];
 assert.equal(presets.length,10);presets.forEach(p=>{assert.equal(p[1],'true');assert.ok(+p[2]>=40&&+p[2]<=60);});
 assert.ok(!html.includes('drawTrails=function'));
 assert.ok(html.indexOf('tracking-core.js')>=0&&html.indexOf('tracking-core.js')<html.indexOf('TsuyaTracking.createTracker()'));
 assert.ok(html.includes('tracking-core.js?v=mobile90'));
 assert.ok(html.includes("const BUILD_VERSION = 'mobile96'"));
 assert.ok(html.includes('pendingTrackingSession!==trackingSession'));
});

test('artwork pages open a five-nail set with a reliable return before camera try-on',()=>{
 assert.ok(html.includes('id="nailSetViewer"'));
 assert.ok(html.includes('id="setViewerNails"'));
 assert.ok(html.includes('このセットを試着する'));
 assert.ok(html.includes('作品ページへ戻る'));
 assert.ok(html.includes("$('workNails').addEventListener('click',openSetViewer)"));
 assert.ok(html.includes("$('nailSetBack').addEventListener('click',closeSetViewer)"));
 assert.ok(html.includes("document.getElementById('setViewerTry').href=tryRoute(current,artworkTryLength)"));
});

test('a slow but freshly received inference still displays the hand without extrapolating it',()=>{
 const t=createTracker();t.update(frame(.5),0,200);
 assert.equal(t.project(230)[0][0].x,.5);
 assert.deepEqual(t.project(350),[]);
});

test('a resting nail holds its full pose against position, length and angle noise',()=>{
 let pose=stabilizeNail(null,{x:300,y:200,len:40,ang:1},1/60);
 for(let i=1;i<600;i++){
  pose=stabilizeNail(pose,{x:300+Math.sin(i*1.1),y:200+Math.cos(i*1.4),len:40+Math.sin(i*1.7)*.7,ang:1+Math.sin(i*1.3)*.04},1/60);
  assert.equal(pose.x,300);assert.equal(pose.y,200);assert.equal(pose.len,40);assert.equal(pose.ang,1);
 }
});
test('a locked nail strongly restrains a slow one-directional camera drift before a real hand move',()=>{
 let pose=stabilizeNail(null,{x:300,y:200,len:56,ang:1},1/60);
 for(let i=1;i<120;i++)pose=stabilizeNail(pose,{x:300+i*.025,y:200,len:56+i*.01,ang:1+i*.0008},1/60);
 assert.ok(pose.x<302.2);assert.equal(pose.y,200);
 pose=stabilizeNail(pose,{x:312,y:200,len:56,ang:1},1/60);
 assert.ok(pose.x>307);assert.equal(pose.moving,true);
});
test('nail stabilizer releases promptly for movement, slow drift and finger rotation',()=>{
 let pose=stabilizeNail(null,{x:300,y:200,len:40,ang:Math.PI-.01},1/60);
 pose=stabilizeNail(pose,{x:310,y:200,len:40,ang:-Math.PI+.01},1/60);
 assert.ok(pose.x>308);assert.ok(Math.abs(pose.ang-Math.PI)<.03);
 for(let i=1;i<=180;i++)pose=stabilizeNail(pose,{x:310+i*.1,y:200,len:40,ang:-Math.PI+.01+i*.002},1/60);
 assert.ok(Math.abs(pose.x-328)<1.5);assert.ok(Math.abs(Math.atan2(Math.sin(pose.ang-(-Math.PI+.37)),Math.cos(pose.ang-(-Math.PI+.37))))<.065);
});

test('the rendered nail uses stabilized translation as well as angle and length',()=>{
  assert.ok(html.includes('TsuyaTracking.stabilizeNail(nailState[hi*5+fi],{x:tx,y:ty,len:rawLen,ang:rawAng},dt)'));
  assert.ok(html.includes('ctx.translate(st.x+Math.cos(ang)*pushOut, st.y+Math.sin(ang)*pushOut)'));
});

test('an artwork video starts the same fixed try-on route and SOURCE opens photo creation',()=>{
  assert.ok(!html.includes('id="workTryBtn"'));
  assert.ok(html.includes('aria-label="作品ネイルを試着する"'));
  assert.ok(html.includes("workFilm.addEventListener('click',startArtworkTryOn)"));
  assert.ok(html.includes("location.href=tryRoute(current,artworkTryLength)"));
  assert.match(html, /class="source-entry"[^>]*aria-label="写真からネイルを作る"/);
  assert.ok(html.includes('class="source-entry-title">SOURCE</span>'));
  assert.ok(html.includes('class="source-entry-sub">写真からつくる</span>'));
  assert.ok(html.includes('id="workFilmCode"'));
  assert.ok(html.includes('id="workFilmTitle"'));
  assert.ok(!html.includes('id="workCode"'));
  assert.ok(!html.includes('id="workTitle"'));
});

test('SOURCE keeps four modes but offers one completed five-nail set for each',()=>{
  const start=html.indexOf('function sourceRecipes(mode){');
  const end=html.indexOf('function makeSourceSets(mode){',start);
  const sandbox={}; vm.createContext(sandbox); vm.runInContext(html.slice(start,end),sandbox);
  ['COLOR','PATTERN','LIGHT','MIX'].forEach(mode=>{
    const sets=sandbox.sourceRecipes(mode);
    assert.equal(sets.length,1);
    assert.equal(sets[0][0],mode);
    assert.equal(sets[0][1].length,5);
  });
  assert.ok(!html.includes("['HALO'"));
  assert.ok(!html.includes("['FLASH'"));
});

test('gel rendering retains depth and respects plain versus artwork decoration',()=>{
  let fills=0,strokes=0;
  const c={globalAlpha:1,save(){},restore(){},fillRect(){fills++;},translate(){},rotate(){},beginPath(){},moveTo(){},quadraticCurveTo(){},stroke(){strokes++;},createLinearGradient(){return {addColorStop(){}};}};
  const code=html.slice(html.indexOf('function getFoilWireProfile('),html.indexOf('function nailShapeSpecimen('));
  const box={c,seeded:()=>()=>.5,flatLook:()=>false};
  vm.createContext(box);vm.runInContext(code,box);
  vm.runInContext("paintGelTip(c,30,60,0,1,'onecolor')",box);
  assert.ok(fills>=3);assert.equal(strokes,0);
  const plain=fills;
  vm.runInContext("paintGelTip(c,30,60,0,1,'artSculpt')",box);
  assert.ok(fills-plain>plain);assert.equal(strokes,3);
});

test('camera uses the strongest skin correction by default without recoloring nails',()=>{
  assert.ok(html.includes("const SKIN_FX_PRESETS={"));
  assert.ok(html.includes("let skinFx='white'"));
  assert.ok(html.includes("const sp = SKIN_FX_PRESETS[skinFx]"));
  assert.ok(html.includes('drawNails(dt);'));
});

// Run the actual pose-to-Canvas path; only material painting is stubbed.
function drawingHarness(){
 const translations=[];
 const gradient={addColorStop(){}};
 const ctx=new Proxy({translate(x,y){translations.push([x,y]);},createRadialGradient(){return gradient;}},{get(o,k){return k in o?o[k]:()=>{};}});
 const box={TsuyaTracking:{stabilizeNail},ctx,canvas:{width:1280,height:720},facing:'environment',performance:{now:()=>0},tuneVals:{opacity:96,gloss:0,nailSize:100,sculptLen:164,sculptShape:'natural'},renderLandmarks:[],sparkT:0,nailPath(){},paintByKey(){},paintGelTip(){},nailLooks:Array(5).fill('onecolor'),nailColors:Array(5).fill('#ffffff')};
 vm.createContext(box);
 vm.runInContext(html.slice(html.indexOf('const FINGERS ='),html.indexOf('function flatLook(')),box);
 return {box,draw(lm,dt=1/60){box.renderLandmarks=lm;translations.length=0;box.dt=dt;vm.runInContext('drawNails(dt)',box);return translations.map(p=>[...p]);},poses(){return vm.runInContext('nailState',box);}};
}
function movingHand(x){
 const lm=Array.from({length:21},()=>({x,y:.7,z:0}));
 for(let f=0;f<5;f++)for(let j=1;j<=4;j++)lm[f*4+j]={x:x+f*.03,y:.7-j*.06,z:0};
 return [lm];
}
test('the drawn nails never reverse during constant motion across inference delays',()=>{
 for(const latency of [30,40,50,80])for(const fps of [30,60,120]){
  const tracker=createTracker(),draw=drawingHarness();let sample=-1,previous=null,worst=0;
  for(let i=0;i<fps*2;i++){
   const now=i*1000/fps,k=Math.floor((now-latency)/(1000/30));
   if(k>=0&&k!==sample){tracker.update(movingHand(.3+.15*k/30),k*1000/30,now);sample=k;}
   const positions=draw.draw(tracker.project(now),1/fps);
   if(now>500&&positions.length){if(previous!==null)worst=Math.min(worst,positions[0][0]-previous);previous=positions[0][0];}
  }
  assert.ok(worst>=-.01,`latency=${latency}, fps=${fps}, reversal=${worst}`);
 }
});
test('projection is independent of repeated reads and holds bounded prediction until loss',()=>{
 const t=createTracker();for(let i=0;i<30;i++)t.update(frame(.3+i*.005),i*1000/30,i*1000/30+40);
 const first=t.project(1010);assert.deepEqual(t.project(1010),first);
 const held=t.project(1080);assert.deepEqual(held,first);
 assert.deepEqual(t.project(1160),[]);
});
test('translation does not release stationary angle or size noise',()=>{
 let pose=stabilizeNail(null,{x:300,y:200,len:40,ang:1},1/60);
 for(let i=1;i<180;i++){
  pose=stabilizeNail(pose,{x:300+3*i,y:200,len:40+Math.sin(i*1.7)*.7,ang:1+Math.sin(i*1.3)*.04},1/60);
  assert.equal(pose.ang,1);assert.equal(pose.len,40);
 }
 assert.ok(Math.abs(pose.x-837)<1.5);
});
test('a bent finger stays anchored to its measured tip and uses the distal direction',()=>{
 const draw=drawingHarness(),hand=movingHand(.4);
 hand[0][2]={x:.4-30/1280,y:.4-15/720,z:0};
 hand[0][3]={x:.4,y:.4,z:0};hand[0][4]={x:.4+30/1280,y:.4,z:0};
 draw.draw(hand);const p=draw.poses()[0];
 assert.equal(p.x,hand[0][4].x*1280);assert.equal(p.y,hand[0][4].y*720);assert.equal(p.ang,0);
});
test('foreshortened fingers hold the last direction and degenerate first frames are skipped',()=>{
 const draw=drawingHarness(),hand=movingHand(.4);draw.draw(hand);const angle=draw.poses()[0].ang;
 hand[0][4]={...hand[0][3],x:hand[0][3].x+.0001};
 draw.draw(hand);assert.equal(draw.poses()[0].ang,angle);
 const collapsed=[Array.from({length:21},()=>({x:.5,y:.5,z:0}))];
 assert.equal(drawingHarness().draw(collapsed).length,0);
});
