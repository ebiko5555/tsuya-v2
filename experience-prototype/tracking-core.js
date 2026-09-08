/* Timing-aware tracking and sparse motion trails. No camera or network access. */
(function(root){
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const alpha=(cutoff,dt)=>1-Math.exp(-2*Math.PI*cutoff*dt);
  function createTracker(){
    let hands=[],sampleAt=null,receivedAt=null;
    function reset(){hands=[];sampleAt=null;receivedAt=null;}
    function update(input,at,received=at){
      if(!input.length)return hands;
      if(sampleAt!==null&&at<=sampleAt)return hands;
      const gap=sampleAt===null?Infinity:at-sampleAt;
      const dt=clamp(gap/1000,1/120,.1);
      const replace=gap>180||hands.length!==input.length||input.some((lm,h)=>!hands[h]||lm.length!==hands[h].length||Math.hypot(lm[0].x-hands[h][0].x,lm[0].y-hands[h][0].y)>.22);
      if(replace){hands=input.map(lm=>lm.map(p=>({x:p.x,y:p.y,z:p.z||0,rawX:p.x,rawY:p.y,vx:0,vy:0,rawVX:0,rawVY:0,cx:2.4,cy:2.4,consistentX:0,consistentY:0})));}
      else input.forEach((lm,h)=>lm.forEach((p,i)=>{
        const s=hands[h][i];
        for(const [axis,rawKey,vKey,rawVKey,cKey] of [['x','rawX','vx','rawVX','cx'],['y','rawY','vy','rawVY','cy']]){
          const rawV=(p[axis]-s[rawKey])/dt;
          const reversing=rawV*s[rawVKey]<0;
          const consistentKey=axis==='x'?'consistentX':'consistentY';
          s[consistentKey]=Math.abs(rawV)>.012&&!reversing?s[consistentKey]+1:0;
          if(reversing)s[vKey]*=.2;
          s[vKey]+=alpha(3,dt)*(rawV-s[vKey]);
          if(Math.abs(rawV)<.008)s[vKey]*=.25;
          const cutoff=2.4+28*Math.abs(s[vKey]);
          const stopping=Math.abs(rawV)<.008&&Math.abs(s[rawVKey])>.04;
          s[axis]+=alpha(stopping?16:cutoff,dt)*(p[axis]-s[axis]);
          s[cKey]=cutoff;s[rawKey]=p[axis];s[rawVKey]=rawV;
        }
        s.z=p.z||0;
      }));
      sampleAt=at;receivedAt=received;return hands;
    }
    function project(now){
      if(sampleAt===null||now-receivedAt>140)return [];
      const age=Math.max(0,(now-sampleAt)/1000);
      // Cap prediction, then hold it until a new observation or the loss timeout.
      // Expiring an offset between observations makes a moving hand jump backward.
      return hands.map(lm=>lm.map(s=>{
        const out={x:s.x,y:s.y,z:s.z};
        for(const [axis,vKey,rawVKey,cKey] of [['x','vx','rawVX','cx'],['y','vy','rawVY','cy']]){
          const conKey=axis==='x'?'consistentX':'consistentY';
          const active=s[conKey]>=2&&Math.abs(s[rawVKey])>.012&&s[vKey]*s[rawVKey]>0;
          const horizon=Math.min(.045,age+1/(2*Math.PI*s[cKey]));
          const targetExtrap=active?clamp(s[vKey]*horizon,-.018,.018):0;
          // Projection is read-only: its result must not depend on display refresh rate.
          out[axis]+=targetExtrap;
        }
        return out;
      }));
    }
    return {update,project,reset};
  }
  function smoothNail(previous,length,angle,dt){
    if(!previous)return {len:length,ang:angle};
    const dAng=Math.atan2(Math.sin(angle-previous.ang),Math.cos(angle-previous.ang));
    const relative=Math.abs(length-previous.len)/Math.max(previous.len,1);
    return {len:previous.len+alpha(7+relative*24,dt)*(length-previous.len),ang:previous.ang+alpha(9+Math.abs(dAng)*20,dt)*dAng};
  }
  // Stabilize the complete nail pose, so position, angle and length settle together.
  // Independent damping for angle and length prevents lever-arm vibration from fluttering the tip.
  function stabilizeNail(previous,target,dt){
    const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
    if(!previous||!Number.isFinite(previous.x))return {...target,mean:{...target}};
    const safeDt=clamp(dt,1/120,.1);
    const mean=previous.mean||previous;
    const avg=alpha(2,safeDt);
    const nextMean={x:mean.x+(target.x-mean.x)*avg,y:mean.y+(target.y-mean.y)*avg,len:mean.len+(target.len-mean.len)*avg,ang:mean.ang+angleDelta(target.ang,mean.ang)*avg};
    const positionNoise=Math.max(2.4,target.len*.08);
    const lengthNoise=Math.max(1.2,target.len*.052),angleNoise=.09;
    const rawMove=Math.hypot(target.x-previous.x,target.y-previous.y);
    const meanMove=Math.hypot(nextMean.x-previous.x,nextMean.y-previous.y);
    const rawLength=Math.abs(target.len-previous.len), meanLength=Math.abs(nextMean.len-previous.len);
    const rawAngle=Math.abs(angleDelta(target.ang,previous.ang)), meanAngle=Math.abs(angleDelta(nextMean.ang,previous.ang));
    // Translation must not unlock unrelated angle or size noise.
    const isMoving=(wasMoving,raw,mean,noise)=>wasMoving
      ?raw>noise*.44||mean>noise*.28
      :raw>noise*1.4||mean>noise*.78;
    const movingPos=isMoving(previous.movingPos,rawMove,meanMove,positionNoise);
    const movingAng=isMoving(previous.movingAng,rawAngle,meanAngle,angleNoise);
    const movingLen=isMoving(previous.movingLen,rawLength,meanLength,lengthNoise);
    // Position tracks quickly for responsive hand motion
    const followPos=alpha(18+rawMove/Math.max(target.len,1)*25,safeDt);
    // Angle uses a refined hydraulic damper to stop high-frequency flutter from whipping the nail tip
    const followAng=alpha(12+rawAngle*20,safeDt);
    // Length uses smooth settling to eliminate breathing jitter
    const followLen=alpha(10+rawLength/Math.max(target.len,1)*20,safeDt);
    return {
      x:previous.x+(movingPos?(target.x-previous.x)*followPos:0),
      y:previous.y+(movingPos?(target.y-previous.y)*followPos:0),
      len:previous.len+(movingLen?(target.len-previous.len)*followLen:0),
      ang:previous.ang+(movingAng?angleDelta(target.ang,previous.ang)*followAng:0),
      mean:nextMean,
      movingPos,movingAng,movingLen,
      moving:movingPos||movingAng||movingLen
    };
  }
  function createTrailSampler(){
    const tips=new Map();
    return {
      reset(){tips.clear();},
      sample(key,x,y,now,pixelsPerUnit=1){
        const previous=tips.get(key);tips.set(key,{x,y,time:now,born:previous?.born??now});
        if(!previous||now-previous.time>140)return null;
        const dt=(now-previous.time)/1000;
        const distance=Math.hypot(x-previous.x,y-previous.y)/pixelsPerUnit;
        // Test each finger separately: another finger must never count as movement.
        if(dt<=0||distance/dt<9||distance>100||now-previous.born<28)return null;
        tips.get(key).born=now;
        return {x,y,born:now};
      }
    };
  }
  const api={createTracker,smoothNail,stabilizeNail,createTrailSampler};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TsuyaTracking=api;
})(typeof globalThis!=='undefined'?globalThis:this);
