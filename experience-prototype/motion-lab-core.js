/* Trial 96: comparison only. No camera, storage or network operations here. */
(function(root){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const alpha=(hz,dt)=>1-Math.exp(-2*Math.PI*hz*dt);
  const turn=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function smoothPose(previous,target,dt){
    if(!previous) return {...target,raw:{...target},velocity:{x:0,y:0,ang:0,len:0}};
    dt=clamp(dt,1/120,.15);
    const raw=previous.raw||previous, pv=previous.velocity||{x:0,y:0,ang:0,len:0};
    const velocity={};
    for(const key of ['x','y','ang','len']){
      const delta=key==='ang'?turn(target[key],raw[key]):target[key]-raw[key];
      velocity[key]=pv[key]+alpha(1.5,dt)*(delta/dt-pv[key]);
    }
    const size=Math.max(4,target.len);
    const posHz=3.5+Math.min(24,Math.hypot(velocity.x,velocity.y)/size*5);
    return {
      x:previous.x+alpha(posHz,dt)*(target.x-previous.x),
      y:previous.y+alpha(posHz,dt)*(target.y-previous.y),
      ang:previous.ang+alpha(4+Math.min(20,Math.abs(velocity.ang)*4),dt)*turn(target.ang,previous.ang),
      len:previous.len+alpha(3.5+Math.min(18,Math.abs(velocity.len)/size*5),dt)*(target.len-previous.len),
      raw:{...target},velocity
    };
  }
  function clean(hands){
    return (hands||[]).filter(lm=>lm.length===21&&lm.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))
      .map(lm=>lm.map(p=>({x:p.x,y:p.y,z:Number.isFinite(p.z)?p.z:0})));
  }
  function createSession(makeCanvas){
    let spare=makeCanvas(),pending=null,completed=null,serial=0;
    let timing='matched',smoothing='continuous',poseCache=[],poseTimes=[];
    let inference=[],drawTimes=[],lastDraw=null;
    function clearPoses(){poseCache=[];poseTimes=[];}
    function reset(){pending=null;completed=null;clearPoses();inference=[];drawTimes=[];lastDraw=null;}
    function begin(input,at){
      if(pending)return null;
      const w=input.videoWidth||input.width,h=input.videoHeight||input.height;
      if(!w||!h)return null;
      if(spare.width!==w||spare.height!==h){spare.width=w;spare.height=h;}
      spare.getContext('2d').drawImage(input,0,0,w,h);
      pending={image:spare,at,id:++serial};
      return pending;
    }
    function finish(id,raw,observed,received){
      if(!pending||pending.id!==id)return false;
      const old=completed;
      if(old&&received-old.received>400)clearPoses();
      completed={...pending,raw:clean(raw),observed:clean(observed),received};
      if(!completed.raw.length){completed.observed=[];clearPoses();}
      spare=old?old.image:makeCanvas();
      pending=null;
      inference.push(Math.max(0,received-completed.at));if(inference.length>90)inference.shift();
      return true;
    }
    function cancel(id){if(pending&&pending.id===id)pending=null;}
    function configure(next){
      if(next.timing==='latest'||next.timing==='matched')timing=next.timing;
      if(next.smoothing==='existing'||next.smoothing==='continuous')smoothing=next.smoothing;
      clearPoses();
    }
    function select(now,input,projected){
      if(timing==='matched'&&completed&&now-completed.received<=400){
        return {image:completed.image,landmarks:smoothing==='existing'?completed.observed:completed.raw};
      }
      const fresh=completed&&now-completed.received<=140;
      return {image:input,landmarks:timing==='matched'?[]:smoothing==='existing'?projected:(fresh?completed.raw:[])};
    }
    function pose(index,previous,target,dt,existing){
      if(timing==='matched'&&completed){
        if(poseCache[index]?.id===completed.id)return poseCache[index].value;
        const old=poseCache[index]?.value;
        const step=poseTimes[index]===undefined?dt:(completed.at-poseTimes[index])/1000;
        const value=smoothing==='continuous'?smoothPose(old,target,step):existing(old,target,step);
        poseCache[index]={id:completed.id,value};poseTimes[index]=completed.at;
        return value;
      }
      return smoothing==='continuous'?smoothPose(previous,target,dt):existing(previous,target,dt);
    }
    function tick(now){
      if(lastDraw!==null){drawTimes.push(now-lastDraw);if(drawTimes.length>120)drawTimes.shift();}
      lastDraw=now;
    }
    function stats(now){
      const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
      const sorted=drawTimes.slice().sort((a,b)=>a-b);
      return {timing,smoothing,inferenceMs:mean(inference),fps:mean(drawTimes)?1000/mean(drawTimes):0,
        gap95:sorted.length?sorted[Math.floor((sorted.length-1)*.95)]:0,
        sampleAge:completed?Math.max(0,now-completed.at):0,hasHand:!!completed?.raw.length};
    }
    return {begin,finish,cancel,reset,configure,select,pose,tick,stats};
  }
  const api={smoothPose,createSession};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TsuyaMotionLabCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
