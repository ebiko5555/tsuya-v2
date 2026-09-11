const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const lens=fs.readFileSync(require.resolve('../light-lens-prototype/index.html'),'utf8');
const base=fs.readFileSync(require.resolve('../experience-prototype/index.html'),'utf8');
function section(html,a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,`${a} section missing`);return html.slice(i,j);}
test('every inline script parses',()=>{for(const m of lens.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc=|importmap/.test(m[1]))new vm.Script(m[2]);});
test('artwork stays primary before photo and hand',()=>{
  assert.match(lens,/body\.art-page \.work-film\{left:0;top:0;width:100%;height:100svh/);
  assert.match(lens,/この作品からつくる/);
  assert.match(lens,/作品の線・形 ＋ 写真から選んだ色/);
  assert.match(lens,/手に重ねる/);
  assert.doesNotMatch(lens,/const startArtworkTryOn=/);
  assert.match(lens,/lensFilm\.src=origin\.film/);
});
test('artwork CTA opens a fixed five-nail work before photo selection',()=>{
  assert.match(lens,/customLink\.href='#nail-set-viewer'/);
  assert.match(lens,/customLink\.onclick=event=>\{[\s\S]*?openSetViewer\(\)/);
  assert.match(lens,/id="setViewerTry"[^>]+>この5本を手に重ねる/);
  assert.match(lens,/id="setViewerPhoto"[^>]+><strong>写真を選んで、別の5本をつくる/);
});
test('all five nails use fixed artwork-specific detail blueprints',()=>{
  assert.match(lens,/作品ごと・指ごとに固定した設計値/);
  assert.match(lens,/works\[workKey\]\.preset\.looks=blueprints\[workKey\]\.map/);
  assert.match(lens,/paintArtworkBlueprint\(c,w,h,workKey,blueprint,index,col\)/);
});
test('top gallery is manual, immediate, and keeps whole artwork visible',()=>{
  assert.match(lens,/body\.hub-mode \.opening-film\.a,body\.hub-mode \.opening-film\.b\{[\s\S]*?object-fit:contain/);
  assert.match(lens,/body\.art-page \.work-film\{[^}]*object-fit:contain/);
  assert.match(lens,/id="hubPrev"/);
  assert.match(lens,/id="hubNext"/);
  assert.match(lens,/openingIndex\.querySelectorAll\('button'\).*showHubWork/);
  assert.doesNotMatch(lens,/timer=setInterval\(\(\)=>showHubWork/);
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
