const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const html=fs.readFileSync(require.resolve('../experience-prototype/index.html'),'utf8');
function section(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i);return html.slice(i,j);}
function harness(){
 const nodes={};
 function element(){const e={children:[],attrs:{},style:{},textContent:'',dataset:{},append(...v){this.children.push(...v)},appendChild(v){this.children.push(v)},setAttribute(k,v){this.attrs[k]=v},addEventListener(){},querySelectorAll(){return this.children},set innerHTML(v){this.children=[]}};let classes=new Set();Object.defineProperty(e,'className',{get:()=>[...classes].join(' '),set:v=>{classes=new Set(v.split(' '));}});e.classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:v=>classes.has(v)};return e;}
 const s={sourceProfile:{palette:['#335577','#cc4433','#447755','#887744','#443399','#eeeeee','#222222','#ddccbb'],sourceSeed:7,designSeed:19,density:.8,contrast:.7,light:.3},sourceMode:'MIX',sourceSets:[],selectedSourceSet:null,mode:'idle',stream:null,sourceTryLength:'long',document:{createElement:element,body:element(),getElementById:id=>s.$(id)},$:id=>nodes[id]||(nodes[id]=element()),window:{},drawSourceSetPreview(){},applySet(set){s.applied=set;},applyTryLength(){},openSourceConfirm(){},closeSourceConfirm(){},activateSourceTab(){},cancelCaptureTimer(){s.cancelled=true;},startCamera:async()=>{},nodes};
 vm.createContext(s);
 vm.runInContext(html.match(/function seeded\(seed\)\{[^\n]+/)[0],s);
 vm.runInContext(section('function sourceRecipes(mode, profile){','function drawSourceSetPreview('),s);
 vm.runInContext(section('function renderSourceSets({','  function ingestSource('),s);
 vm.runInContext(section('let sourceTryRequest=0;',"document.querySelectorAll('[data-source-mode]').forEach(btn=>btn.onclick"),s);
 return s;
}
test('mode changes select a current set and preserve the selected third option',()=>{
 const s=harness();s.renderSourceSets();s.selectedSourceSet=s.sourceSets[2];s.sourceMode='COLOR';s.renderSourceSets();
 assert.equal(s.selectedSourceSet,s.sourceSets[2]);assert.match(s.selectedSourceSet.name,/COLOR/);assert.equal(s.$('sourceSets').children.filter(e=>e.classList.contains('active')).length,1);
});
test('new source resets selection and never reuses previous colors',()=>{
 const s=harness();s.renderSourceSets();const old=s.selectedSourceSet;s.sourceProfile.palette=['#00ff00'];s.renderSourceSets({resetSelection:true});
 assert.notEqual(s.selectedSourceSet,old);assert.ok(s.selectedSourceSet.colors.every(x=>x==='#00ff00'));
 assert.ok(section('  function ingestSource(', 'function sourcePointFromEvent(').includes('renderSourceSets({resetSelection:true})'));
});
test('returning from frozen try-on retains exact selection and clears shot controls and timer',()=>{
 const s=harness();s.renderSourceSets();s.selectedSourceSet=s.sourceSets[2];const chosen=s.selectedSourceSet;s.mode='frozen';s.stream={};s.document.body.classList.add('source-tryon','photo-frozen');
 s.returnToSourcePlanning();assert.equal(s.selectedSourceSet,chosen);assert.equal(s.sourceTryLength,'long');assert.equal(s.mode,'live');assert.equal(s.$('snapBar').style.display,'none');assert.ok(s.cancelled);assert.ok(s.document.body.classList.contains('source-planning'));assert.ok(!s.document.body.classList.contains('photo-frozen'));
});
test('failed camera startup restores selectable SOURCE instead of stranding the user',async()=>{
 const s=harness();s.renderSourceSets();s.$('sourceConfirmTry').onclick();await new Promise(r=>setImmediate(r));assert.ok(s.document.body.classList.contains('source-planning'));assert.ok(!s.document.body.classList.contains('source-tryon'));assert.equal(s.$('sourceConfirmTry').disabled,false);
});
test('return during camera startup is not undone when startup finishes',async()=>{
 const s=harness();s.renderSourceSets();let resolve;s.startCamera=()=>new Promise(r=>{resolve=()=>{s.mode='live';s.document.body.classList.remove('source-planning');r();};});s.$('sourceConfirmTry').onclick();s.returnToSourcePlanning();resolve();await new Promise(r=>setImmediate(r));assert.ok(s.document.body.classList.contains('source-planning'));assert.ok(!s.document.body.classList.contains('source-tryon'));
});
test('EXTRA uses a supported shape; removed repick button stays absent',()=>{
 const s=harness();s.renderSourceSets();const shape=s.sourceSets[2].tune.sculptShape;assert.ok(section('function nailPath(', '/* ================= 光の軌跡').includes("case '"+shape+"':"));assert.ok(!html.includes('sourceRepickPhoto'));
});
test('trial 30 tracking, camera loops and nail positioning remain byte-for-byte unchanged from mobile104',()=>{
 for(const [a,b,hash]of [
 ['function ensureLive(){','/* ================= カメラ','343217cc12198a0604eb03558861f8a7a0c046d4d7cd7735f24045d36b721179'],
 ['let cameraStarting=false;',"$('startBtn').onclick",'ee719d9817af35b6ae888f3cca42b624eb8c55daaa1b4c0e6d107b5e20473e2f'],
 ['const FINGERS =','function flatLook(','47f3476d5c5426da55d2033f7f0abc1798897322e596c34fa385c9afe1a7bc31']
 ])assert.equal(crypto.createHash('sha256').update(section(a,b)).digest('hex'),hash);
});
test('every inline script parses',()=>{for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc=|importmap/.test(m[1]))new vm.Script(m[2]);});
test('reopening confirmation preserves the user-selected LONG length',()=>{
 const s=harness();s.renderSourceSets();s.renderLengthChoice=()=>{};s.drawLargeSourceSetPreview=()=>{};
 vm.runInContext(section('function openSourceConfirm(set){','function closeSourceConfirm(){'),s);
 s.openSourceConfirm(s.selectedSourceSet);assert.equal(s.sourceTryLength,'long');s.openSourceConfirm(s.sourceSets[2]);assert.equal(s.sourceTryLength,'long');
});
test('cancelled or replaced countdown cannot take a late photograph',()=>{
 const s=harness(),timers=new Map();let id=0,captures=0;s.setTimeout=fn=>{timers.set(++id,fn);return id;};s.clearTimeout=id=>timers.delete(id);s.doCapture=()=>captures++;
 vm.runInContext(section("$('shutterBtn').onclick", "$('cmpBtn').onclick"),s);
 s.$('timerBtn').onclick();assert.equal(timers.size,1);s.$('timerBtn').onclick();assert.equal(timers.size,1);s.cancelCaptureTimer();assert.equal(timers.size,0);assert.equal(captures,0);
 s.$('timerBtn').onclick();s.$('shutterBtn').onclick();assert.equal(captures,1);assert.equal(timers.size,0);
});
test('SOURCE shutter controls are anchored below the existing return pill',()=>{
 assert.ok(html.includes('body.custom-mode.source-tryon #liveBtns{position:fixed;bottom:calc(20px + env(safe-area-inset-bottom))}'));
 assert.ok(html.includes('bottom:calc(92px + env(safe-area-inset-bottom));'));
});
