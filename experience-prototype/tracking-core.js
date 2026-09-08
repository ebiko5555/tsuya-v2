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
  // Fit the shared palm motion separately from articulation of individual fingers.
  // Coordinates are isotropic (x is multiplied by the camera aspect ratio).
  function createHandTracker(){
    const palmIndices=[0,5,9,13,17],motion=createTracker();
    let states=[],sampleAt=null,aspect=1,generation=0;
    function reset(){motion.reset();states=[];sampleAt=null;generation++;}
    function fit(points,reference){
      const x=points.reduce((n,p)=>n+p.x,0)/points.length;
      const y=points.reduce((n,p)=>n+p.y,0)/points.length;
      let a=0,b=0,d=0;
      reference.forEach((r,i)=>{
        a+=r.x*(points[i].x-x)+r.y*(points[i].y-y);
        b+=r.x*(points[i].y-y)-r.y*(points[i].x-x);
        d+=r.x*r.x+r.y*r.y;
      });
      return {x,y,scale:Math.hypot(a,b)/Math.max(d,1e-9),ang:Math.atan2(b,a),generation};
    }
    function referenceFor(points){
      const x=points.reduce((n,p)=>n+p.x,0)/points.length;
      const y=points.reduce((n,p)=>n+p.y,0)/points.length;
      const scale=Math.sqrt(points.reduce((n,p)=>n+(p.x-x)**2+(p.y-y)**2,0)/points.length);
      if(scale<.005)return null;
      return points.map(p=>({x:(p.x-x)/scale,y:(p.y-y)/scale}));
    }
    function update(input,at,received=at,cameraAspect=1){
      if(sampleAt!==null&&at<=sampleAt)return project(received);
      if(!input.length||input.some(lm=>lm.length!==21||lm.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))){
        reset();return [];
      }
      const nextAspect=Number.isFinite(cameraAspect)&&cameraAspect>0?cameraAspect:1;
      const gap=sampleAt===null?Infinity:at-sampleAt;
      if(gap>180||states.length!==input.length||aspect!==nextAspect||input.some((lm,i)=>
        !states[i]||Math.hypot(lm[0].x-states[i].wrist.x,lm[0].y-states[i].wrist.y)>.22))reset();
      aspect=nextAspect;
      const dt=clamp(gap/1000,1/120,.1),next=[];
      for(let h=0;h<input.length;h++){
        const lm=input[h],palm=palmIndices.map(i=>({x:lm[i].x*aspect,y:lm[i].y}));
        const previous=states[h],reference=previous?.reference||referenceFor(palm);
        if(!reference){reset();return [];}
        const frame=fit(palm,reference);
        if(frame.scale<.005){reset();return [];}
        const co=Math.cos(frame.ang),si=Math.sin(frame.ang);
        const points=lm.map((p,i)=>{
          const dx=p.x*aspect-frame.x,dy=p.y-frame.y;
          const x=(co*dx+si*dy)/frame.scale,y=(-si*dx+co*dy)/frame.scale;
          const old=previous?.points[i];
          if(!old)return {x,y,z:p.z||0,history:[{x,y}]};
          const history=[...old.history,{x,y}].slice(-3);
          // A single bad inference must not detach a chip from the hand.
          const median=axis=>[...history].sort((a,b)=>a[axis]-b[axis])[Math.floor(history.length/2)][axis];
          const mx=history.length===3?median('x'):x,my=history.length===3?median('y'):y;
          const error=Math.hypot(mx-old.x,my-old.y);
          const follow=alpha(1.25+clamp((error-.025)*35,0,10),dt);
          return {x:old.x+(mx-old.x)*follow,y:old.y+(my-old.y)*follow,z:p.z||0,history};
        });
        next.push({reference,points,wrist:{x:lm[0].x,y:lm[0].y}});
      }
      states=next;sampleAt=at;
      motion.update(input.map(lm=>palmIndices.map(i=>lm[i])),at,received);
      return project(received);
    }
    function project(now){
      const palms=motion.project(now);
      if(palms.length!==states.length)return [];
      return palms.map((palm,h)=>{
        const frame=fit(palm.map(p=>({x:p.x*aspect,y:p.y})),states[h].reference);
        const co=Math.cos(frame.ang),si=Math.sin(frame.ang);
        const lm=states[h].points.map(p=>({
          x:(frame.x+frame.scale*(co*p.x-si*p.y))/aspect,
          y:frame.y+frame.scale*(si*p.x+co*p.y),z:p.z
        }));
        lm.palmFrame=frame;
        return lm;
      });
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
    // Lock in hand coordinates, then carry the chip with the shared palm transform.
    // Freezing screen coordinates would leave a chip behind when the hand moves.
    if(target.frame){
      const f=target.frame,co=Math.cos(f.ang),si=Math.sin(f.ang),unit=100/f.scale;
      const dx=target.x-f.x,dy=target.y-f.y;
      const localTarget={x:(co*dx+si*dy)*unit,y:(-si*dx+co*dy)*unit,len:target.len*unit,ang:target.ang-f.ang};
      const local=stabilizeNail(previous?.generation===f.generation?previous.local:null,localTarget,dt);
      return {
        x:f.x+(co*local.x-si*local.y)/unit,
        y:f.y+(si*local.x+co*local.y)/unit,
        len:local.len/unit,ang:local.ang+f.ang,
        local,generation:f.generation,moving:local.moving
      };
    }
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
  const api={createTracker,createHandTracker,smoothNail,stabilizeNail,createTrailSampler};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TsuyaTracking=api;
})(typeof globalThis!=='undefined'?globalThis:this);
