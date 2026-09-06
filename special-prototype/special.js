/* Special edition: a new interface over the existing nail and camera engine. */
(() => {
  const catalog = [
    ['COLOR','色','color-pattern'], ['SURFACE','表面','surface-gold'],
    ['SCULPT','FORMWORK','sculpt-wire'], ['LIGHT','光','light-mandala'],
    ['HAND','手','hand-drawing'], ['TRACE','痕跡','trace-dust'],
    ['SPACE','宇宙と手','space-hand'], ['THINKING','思惟する手','thinking-hand'],
    ['ORB','White Orb','nail-white-orb'], ['FRAME','二つの手の輪舞曲','frame-0001-0240']
  ];
  const grid = document.getElementById('collectionGrid');
  if (grid) {
    catalog.forEach(([key,title,file],i) => {
      const link = document.createElement('a');
      link.className = 'collection-card';
      link.href = `app.html?work=${key}&v=special01`;
      link.innerHTML = `<div class="collection-image"><img src="../experience-prototype/art-assets/${file}.webp" alt="${title}の作品" loading="lazy"><span>${String(i+1).padStart(2,'0')}</span></div><div class="collection-caption"><div><small>${key}</small><h3>${title}</h3></div><span aria-hidden="true">↗</span></div>`;
      grid.append(link);
    });
    const hero = document.querySelector('.hero-art video');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => { if (reduced.matches || document.hidden) hero.pause(); else hero.play().catch(()=>{}); };
    reduced.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    syncMotion();
    return;
  }

  const body = document.body;
  const params = new URLSearchParams(location.search);
  const byId = id => document.getElementById(id);
  document.title = 'tsuya — 特別試作 01';
  byId('siteHome').textContent = 'tsuya';
  byId('globalBackText').textContent = '戻る';
  document.querySelector('#workClose span').textContent = '作品一覧';
  byId('siteHome').href = './?v=special01';
  document.querySelectorAll('[data-length]').forEach(button => {button.textContent = button.dataset.length === 'short' ? '短め' : '長め';});
  document.querySelectorAll('.tab').forEach(tab => {
    tab.setAttribute('role','button'); tab.tabIndex=0;
    tab.addEventListener('keydown',event => {if(event.key==='Enter'||event.key===' '){event.preventDefault();tab.click();}});
    if(tab.dataset.t==='source')tab.textContent='写真';
    if(tab.dataset.t==='sculpt')tab.textContent='形・長さ';
  });
  document.querySelectorAll('.ghostlink').forEach(link => {
    link.setAttribute('role','button');link.tabIndex=0;
    link.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();link.click();}});
  });
  const trailSwitch=byId('trailSwitch');
  trailSwitch.setAttribute('role','switch');trailSwitch.tabIndex=0;trailSwitch.setAttribute('aria-label','光の軌跡');
  const syncSwitch=()=>trailSwitch.setAttribute('aria-checked',String(trailSwitch.classList.contains('on')));
  new MutationObserver(syncSwitch).observe(trailSwitch,{attributes:true,attributeFilter:['class']});syncSwitch();
  trailSwitch.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();trailSwitch.click();}});
  const copy = document.querySelector('.work-copy');
  const heading = document.createElement('div');heading.className='special-work-heading';
  copy.prepend(heading);
  const trial = document.createElement('button');trial.type='button';trial.className='special-try primary-action';trial.textContent='このネイルを試着する ↗';
  trial.addEventListener('click',()=>byId('workFilm').click());copy.append(trial);
  const updateWork = () => {
    const key=body.dataset.workKey || params.get('work') || 'COLOR';
    const work=window.specialWorks[key];if(!work)return;
    heading.innerHTML=`<p class="eyebrow">${work.no} / ${key}</p><h1>${work.title}</h1><p class="work-preview-label">指先にまとう、5つの表情。</p>`;
    const link=document.querySelector('.source-entry');
    link.onclick=null;
    link.innerHTML='<span>この作品からつくる</span><span aria-hidden="true">↗</span>';
  };
  new MutationObserver(updateWork).observe(byId('workFilmCode'),{childList:true,characterData:true,subtree:true});updateWork();

  const editorIntro = document.createElement('div');editorIntro.className='studio-preview';
  editorIntro.innerHTML='<p class="eyebrow">YOUR NAIL STUDIO</p><h1>あなたの、5本。</h1><canvas id="studioPreview" width="620" height="300" aria-label="編集中の5本のネイル"></canvas><span>色も、形も、ひとつずつ。</span>';
  document.querySelector('.stage').append(editorIntro);
  const studioActions=document.createElement('div');studioActions.className='studio-actions';
  studioActions.innerHTML='<button type="button" id="studioSave">セットを保存</button><button type="button" id="studioTry">試着する ↗</button>';
  byId('controlPanel').append(studioActions);
  const preview = () => {
    if(!body.classList.contains('custom-mode')||body.classList.contains('camera-started'))return;
    const cv=byId('studioPreview'),c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
    const scale=tuneVals.nailSize/100,length=tuneVals.sculptLen/140;
    [122,140,150,140,122].forEach((h,i)=>paintExhibitNail(c,62+i*124,148,52*scale,h*length*scale,0,i));
  };
  const openStudio = () => {
    body.classList.add('studio-editing','source-planning');
    window.setControlPanelCollapsed(false);
    document.querySelector('.tab[data-t="looks"]').click();preview();
  };
  const saveDialog=document.createElement('dialog');saveDialog.className='special-save-dialog';
  saveDialog.innerHTML='<form id="specialSaveForm"><p class="eyebrow">KEEP YOUR DESIGN</p><h2>この5本に、名前を。</h2><label for="specialSetName">セット名</label><input id="specialSetName" name="name" maxlength="40" required autocomplete="off"><p class="save-error" role="alert"></p><div><button type="button" id="cancelSpecialSave">戻る</button><button type="submit">保存する</button></div></form>';
  body.append(saveDialog);
  const openSave=()=>{byId('specialSetName').value='セット '+(loadSets().length+1);saveDialog.querySelector('.save-error').textContent='';saveDialog.showModal();byId('specialSetName').focus();};
  byId('studioSave').onclick=openSave;byId('saveSetLink').onclick=openSave;
  byId('cancelSpecialSave').onclick=()=>saveDialog.close();
  byId('specialSaveForm').onsubmit=event=>{
    event.preventDefault();const name=byId('specialSetName').value.trim();if(!name)return;
    const set=snapshotSet(name);set.trail={on:trailOn,intensity:trailIntensity,hue:trailHue};
    if(sourceProfile)set.sourceProfile=sourceProfile;
    try{localStorage.setItem(SETS_KEY,JSON.stringify([set,...loadSets()].slice(0,20)));buildSetsRow();saveDialog.close();byId('studioSave').textContent='保存しました';setTimeout(()=>byId('studioSave').textContent='セットを保存',2000);}
    catch{saveDialog.querySelector('.save-error').textContent='保存容量が足りません。空き容量を確認してください。';}
  };
  const originalApplySet=applySet;
  applySet=set=>{
    if(set.sourceProfile)sourceProfile=set.sourceProfile;
    originalApplySet(set);
    if(set.trail){trailOn=set.trail.on;trailIntensity=set.trail.intensity;trailHue=set.trail.hue;byId('trailSwitch').classList.toggle('on',trailOn);byId('trailIntensity').value=trailIntensity;buildTrailSwatches();}
    requestAnimationFrame(preview);
  };
  new MutationObserver(()=>{if(selectedSourceSet){applySet(selectedSourceSet);preview();}}).observe(byId('sourceSets'),{childList:true});
  byId('studioTry').onclick=()=>{
    body.classList.remove('source-camera-capture');
    startCamera();
  };
  document.addEventListener('input',()=>requestAnimationFrame(preview));
  document.addEventListener('click',()=>requestAnimationFrame(preview));
  const syncBody=()=>{
    const planning=body.classList.contains('source-planning');
    if(planning && !body.classList.contains('camera-started')){
      byId('controlPanel').classList.remove('collapsed');
      byId('sheetHandle').setAttribute('aria-expanded','true');
    }
    preview();
  };
  new MutationObserver(syncBody).observe(body,{attributes:true,attributeFilter:['class']});
  byId('sourceTry').textContent='このネイルを試す ↗';
  byId('sourceConfirmTry').textContent='カメラで試着する ↗';
  byId('sourceConfirmBack').textContent='← デザインへ';
  if(body.classList.contains('work-tryon')){
    byId('startBtn').textContent='カメラをひらく ↗';
    document.querySelector('#startOverlay .invite').textContent='指先で、出会う。';
    byId('openingGuide').textContent='カメラに手をかざして、試着。';
    document.querySelector('.opening-mark').textContent='VIRTUAL TRY ON';
  }
  if(body.classList.contains('custom-mode')){
    document.querySelector('#startOverlay .invite').innerHTML='好きな色を、<br>あなたのものに。';
    document.querySelector('.opening-mark').textContent='CREATE YOUR OWN';
    byId('openingGuide').textContent='一枚の写真から、5本のネイルへ。';
    const actions=document.querySelector('.opening-actions');
    const upload=document.querySelector('.make-link');upload.textContent='写真を選ぶ ↗';actions.prepend(upload);
    byId('startBtn').textContent='カメラで色をひろう';
    const free=document.createElement('button');free.type='button';free.className='free-create';free.textContent='自由にデザインする';free.onclick=openStudio;actions.append(free);
    const privacy=document.createElement('p');privacy.className='photo-privacy';privacy.textContent='写真はこの端末の中だけで処理されます。';actions.append(privacy);
    const chooseOther=document.createElement('button');chooseOther.type='button';chooseOther.className='choose-other';chooseOther.textContent='写真を選ぶ・変更';chooseOther.onclick=()=>byId('sourcePhoto').click();byId('tray-source').prepend(chooseOther);
  }
  document.querySelectorAll('input[type="range"]').forEach(input=>{if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',input.parentElement.textContent.trim()||'調整');});
  const makeToolsAccessible=()=>{
    document.querySelectorAll('.look,.finger,.setchip,.chip').forEach(control=>{
      if(control.dataset.specialAccessible)return;
      control.dataset.specialAccessible='true';control.tabIndex=0;control.setAttribute('role','button');
      if(control.classList.contains('look')){
        const label=control.textContent.trim();
        control.setAttribute('aria-label',control.dataset.key?label:(control.querySelector('svg')?.innerHTML.includes('17.3')?'手描きする':'画像を柄にする'));
      }
      control.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();control.click();}});
    });
  };
  ['looksRow','fingerRow','fingerRow2','setsRow','chips'].forEach(id=>new MutationObserver(makeToolsAccessible).observe(byId(id),{childList:true}));makeToolsAccessible();
  const notice=document.createElement('div');notice.className='studio-notice';notice.setAttribute('role','status');body.append(notice);
  new MutationObserver(()=>{notice.textContent=body.classList.contains('source-planning')?byId('status').textContent:'';}).observe(byId('status'),{childList:true,characterData:true,subtree:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&byId('sourceConfirm').classList.contains('open'))closeSourceConfirm();});
})();
