(function(root){
  'use strict';
  function mount(api){
    const session=TsuyaMotionLabCore.createSession(()=>document.createElement('canvas'));
    document.body.classList.add('motion-lab');
    const style=document.createElement('style');
    style.textContent=`
      body.motion-lab .stage{position:fixed;top:62px;bottom:var(--motion-panel,330px);height:auto;min-height:0;width:100%;background:#111216}
      body.motion-lab #canvas{object-fit:contain;filter:none}
      body.motion-lab #startOverlay,body.motion-lab #controlPanel,body.motion-lab #liveBtns,body.motion-lab #snapBar,
      body.motion-lab #tryIdentity,body.motion-lab #artSignal,body.motion-lab header{display:none!important}
      .motion-welcome{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#f2eee6;background:#111216}
      .motion-welcome h1{font:400 28px/1.3 'Yu Mincho',serif;margin:0 0 16px}
      .motion-welcome p{font:400 15px/1.8 sans-serif;max-width:32em}
      .motion-panel{position:fixed;z-index:170;bottom:0;left:0;right:0;padding:12px 14px max(12px,env(safe-area-inset-bottom));background:#f2eee6;color:#252626;text-align:center;font:400 14px/1.45 sans-serif;max-height:62svh;overflow:auto}
      .motion-panel [hidden],.motion-welcome[hidden]{display:none!important}
      .motion-inner{max-width:640px;margin:auto}
      .motion-row{display:flex;align-items:center;justify-content:center;gap:8px;margin:6px 0}
      .motion-row>span{width:42px;flex:none;text-align:left}
      .motion-panel button,.motion-upload{position:relative;flex:1;min-height:44px;padding:8px 5px;border:1px solid #b3aba1;background:transparent;color:#252626;border-radius:8px;font:500 14px/1.3 sans-serif;cursor:pointer}
      .motion-panel button[aria-pressed=true]{background:#252626;color:#fff;border-color:#252626}
      .motion-panel button:disabled{opacity:.45;cursor:default}
      .motion-upload{display:flex;align-items:center;justify-content:center;overflow:hidden}
      .motion-upload input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}
      .motion-panel :focus-visible{outline:3px solid #267c83;outline-offset:2px}
      .motion-status{margin:6px 0;min-height:21px;font-size:14px}
      .motion-help{margin:6px 0;font-size:14px;color:#55504a}
      .motion-panel summary{padding:8px;cursor:pointer}
      .motion-stats{font:12px/1.7 ui-monospace,monospace;margin:0;white-space:pre-wrap}
      @media(max-height:520px){body.motion-lab .stage{right:52%;width:48%;bottom:0;top:52px}.motion-panel{left:48%;max-height:100svh}.motion-help{display:none}}
    `;
    document.head.appendChild(style);
    const welcome=document.createElement('section');welcome.className='motion-welcome';
    welcome.innerHTML='<h1>爪の動きを比べる</h1><p>手を止める、ゆっくり動かす、折り返す。<br>同じ動きを録って、見比べられます。</p>';
    document.querySelector('.stage').appendChild(welcome);
    const panel=document.createElement('section');panel.className='motion-panel';panel.setAttribute('aria-label','追跡の比較');
    panel.innerHTML=`<div class="motion-inner">
      <div class="motion-row"><span>映像</span><button type="button" data-timing="latest" aria-pressed="false">最新を映す</button><button type="button" data-timing="matched" aria-pressed="true">時刻を合わせる</button></div>
      <div class="motion-row"><span>動き</span><button type="button" data-smoothing="existing" aria-pressed="false">これまで</button><button type="button" data-smoothing="continuous" aria-pressed="true">なめらか候補</button></div>
      <p class="motion-help">「時刻を合わせる」は映像全体が少し遅れます。</p>
      <div class="motion-row"><button type="button" id="motionCamera">カメラで試す</button><label class="motion-upload">動画で比べる<input type="file" id="motionFile" accept="video/*" aria-label="手の動画を選ぶ"></label></div>
      <div class="motion-row"><button type="button" id="motionRecord" disabled>8秒録画</button><button type="button" id="motionReplay" disabled>はじめから再生</button><button type="button" id="motionLength" aria-pressed="true">長い爪</button></div>
      <p class="motion-status" role="status" aria-live="polite">動画はこの端末内だけで扱います。</p>
      <details><summary>計測を見る</summary><p class="motion-stats"></p><p class="motion-help">数値は処理速度です。爪の位置の正確さを表す値ではありません。</p></details>
    </div>`;
    document.body.appendChild(panel);
    const el=id=>panel.querySelector('#'+id),status=panel.querySelector('.motion-status');
    const resize=()=>document.body.style.setProperty('--motion-panel',panel.getBoundingClientRect().height+'px');
    const observer=new ResizeObserver(resize);observer.observe(panel);resize();
    let replay=false,replayMirror=false,clipURL=null,recorder=null,recordTimer=null,countdown=null,recordStream=null;
    let disposed=false,operation=0,lastStats=0,recording=false;
    function reset(){session.reset();api.resetTracking();}
    function setBusy(value){
      el('motionCamera').disabled=value;el('motionFile').disabled=value;
      el('motionReplay').disabled=value||!replay;el('motionRecord').disabled=value||replay||!api.stream()||!root.MediaRecorder;
    }
    function configured(event){
      const button=event.target.closest('[data-timing],[data-smoothing]');if(!button)return;
      const key=button.dataset.timing?'timing':'smoothing',value=button.dataset[key];
      panel.querySelectorAll('[data-'+key+']').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      session.configure({[key]:value});api.clearPoses();
    }
    panel.addEventListener('click',configured);
    async function loadClip(blob,mirror=false){
      const token=++operation;setBusy(true);api.pause();reset();
      let modelReady=false;
      try{
        await api.ready();if(disposed||token!==operation)return;modelReady=true;
        api.stopStream();api.video.pause();api.video.srcObject=null;
        if(clipURL)URL.revokeObjectURL(clipURL);
        clipURL=URL.createObjectURL(blob);replay=true;replayMirror=mirror;
        api.video.src=clipURL;api.video.muted=true;api.video.loop=true;
        await api.video.play();if(disposed||token!==operation)return;
        api.runReplay();welcome.hidden=true;setBusy(false);
        status.textContent='同じ動画を繰り返しています。上下のボタンで比較できます。';
      }catch(error){
        if(disposed||token!==operation)return;
        replay=false;setBusy(false);status.textContent=modelReady?'動画を再生できませんでした。別の動画を選んでください。':'追跡モデルを準備できませんでした。通信環境を確認して再読み込みしてください。';
      }
    }
    el('motionFile').addEventListener('change',event=>{
      const file=event.target.files[0];event.target.value='';if(!file)return;
      if(file.size>80*1024*1024){status.textContent='80MB以下の短い手の動画を選んでください。';return;}
      void loadClip(file);
    });
    async function camera(){
      const token=++operation;setBusy(true);api.pause();reset();
      replay=false;replayMirror=false;api.video.pause();api.video.srcObject=null;api.video.removeAttribute('src');api.video.loop=false;
      if(clipURL){URL.revokeObjectURL(clipURL);clipURL=null;}
      status.textContent='カメラを準備しています…';
      await api.startCamera();
      if(disposed||token!==operation){api.pause();api.stopStream();return;}
      setBusy(false);
      if(api.running()){
        welcome.hidden=true;
        status.textContent='手を止める → ゆっくり横へ → 折り返す。';
        if(!root.MediaRecorder){el('motionRecord').disabled=true;status.textContent='このブラウザでは録画できません。動画選択は使えます。';}
      }else status.textContent='カメラを開始できませんでした。許可を確認するか、動画を選んでください。';
    }
    el('motionCamera').onclick=()=>{void camera();};
    el('motionLength').onclick=()=>{
      const long=el('motionLength').getAttribute('aria-pressed')!=='true';
      el('motionLength').setAttribute('aria-pressed',String(long));el('motionLength').textContent=long?'長い爪':'短い爪';api.length(long?'long':'short');
    };
    api.length('long');
    el('motionReplay').onclick=()=>{
      if(!replay)return;reset();api.video.currentTime=0;
      api.video.play().catch(()=>{status.textContent='再生ボタンをもう一度押してください。';});
    };
    function clearRecording(){
      clearTimeout(recordTimer);clearInterval(countdown);recordTimer=null;countdown=null;
      recordStream?.getTracks().forEach(track=>track.stop());recordStream=null;recording=false;
      el('motionRecord').textContent='8秒録画';
    }
    el('motionRecord').onclick=()=>{
      if(recording||!api.stream()||replay||!root.MediaRecorder)return;
      const chunks=[],mirror=api.mirrored(),token=++operation;
      try{
        recordStream=new MediaStream(api.stream().getVideoTracks().map(track=>track.clone()));
        const mime=['video/mp4','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
        recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:{});
        recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
        recorder.onerror=()=>{if(disposed||token!==operation)return;operation++;clearRecording();setBusy(false);status.textContent='録画できませんでした。動画選択で比較できます。';};
        recorder.onstop=()=>{
          if(disposed||token!==operation)return;
          const type=recorder.mimeType;clearRecording();
          if(chunks.length)void loadClip(new Blob(chunks,{type}),mirror);
          else{setBusy(false);status.textContent='録画が空でした。もう一度お試しください。';}
        };
        recorder.start();recording=true;setBusy(true);
        let seconds=8;status.textContent='録画中：手を止める → 動かす → 折り返す';el('motionRecord').textContent='録画中 8秒';
        countdown=setInterval(()=>{el('motionRecord').textContent='録画中 '+Math.max(0,--seconds)+'秒';},1000);
        recordTimer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},8000);
      }catch(error){clearRecording();setBusy(false);status.textContent='録画できませんでした。動画選択で比較できます。';}
    };
    api.video.addEventListener('seeking',reset);
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){reset();return;}
      operation++;if(recorder&&recorder.state!=='inactive')recorder.stop();clearRecording();setBusy(false);
      status.textContent='画面に戻ったら、動きをもう一度確認してください。';
    });
    root.addEventListener('pagehide',()=>{
      disposed=true;operation++;if(recorder&&recorder.state!=='inactive')recorder.stop();clearRecording();
      api.stopStream();api.video.pause();if(clipURL)URL.revokeObjectURL(clipURL);observer.disconnect();
    },{once:true});
    root.addEventListener('pageshow',event=>{if(event.persisted&&disposed)location.reload();});
    return {
      ...session,
      reset,
      get replay(){return replay;},
      get replayMirror(){return replayMirror;},
      tick(now){
        session.tick(now);
        if(now-lastStats<500)return;lastStats=now;
        const s=session.stats(now);
        panel.querySelector('.motion-stats').textContent=`解析 ${s.inferenceMs.toFixed(0)} ms / 描画 ${s.fps.toFixed(0)} fps\n長めの描画間隔 ${s.gap95.toFixed(0)} ms / 解析画像の経過 ${s.sampleAge.toFixed(0)} ms\n手の検出 ${s.hasHand?'あり':'なし'} · ${replay?'動画の繰り返し':'カメラ'}`;
      }
    };
  }
  root.TsuyaMotionLab={mount};
})(window);
