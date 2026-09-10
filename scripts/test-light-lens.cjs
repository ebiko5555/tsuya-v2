const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const lens=fs.readFileSync(require.resolve('../light-lens-prototype/index.html'),'utf8');
const base=fs.readFileSync(require.resolve('../experience-prototype/index.html'),'utf8');
function section(html,a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,`${a} section missing`);return html.slice(i,j);}
test('every inline script parses',()=>{for(const m of lens.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc=|importmap/.test(m[1]))new vm.Script(m[2]);});
test('journey is one path from artwork to everyday photo to hand',()=>{
  assert.match(lens,/光を受け取りにいく/);
  assert.match(lens,/この光を連れていく/);
  assert.match(lens,/日常の写真をひらく/);
  assert.match(lens,/この光を手へ戻す/);
  assert.match(lens,/const startArtworkTryOn=\(\)=>\{ location\.href=customRoute\(current\); \};/);
});
test('generated nails combine artwork looks with photo palette',()=>{
  assert.match(lens,/const lens=window\.__TSUYA_LENS_ORIGIN\|\|null/);
  assert.match(lens,/const originLooks=lens\.preset\.looks\.slice\(\)/);
  assert.match(lens,/const colors=\[0,1,2,3,4\]\.map/);
  assert.match(lens,/looks:originLooks/);
});
test('trial 106 tracking and camera engine remain unchanged',()=>{
  for(const [a,b] of [
    ['function ensureLive(){','/* ================= カメラ'],
    ['let cameraStarting=false;',"$('startBtn').onclick"],
    ['const FINGERS =','function flatLook('],
    ['function applyAutomaticSubjectMask(','function sourceSeedFromPixels('],
    ['function analyzeSource(','function sourceRecipes(']
  ]){
    const digest=html=>crypto.createHash('sha256').update(section(html,a,b)).digest('hex');
    assert.equal(digest(lens),digest(base),`${a} changed`);
  }
});
test('prototype uses shared published assets and does not duplicate media',()=>{
  assert.match(lens,/\.\.\/experience-prototype\/art-assets\//);
  assert.match(lens,/\.\.\/experience-prototype\/source-assets\//);
});
