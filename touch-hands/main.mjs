import {BUILD_VERSION,ASSET_VERSION,floatingPose,createFloatWorld,MODEL_CONFIG,clamp,fitCamera,createGesture,advanceRotation,workURL} from './touch-core.mjs?v=mobile77';
const stage=document.getElementById('stage');
const container=document.getElementById('canvas-container');
const veil=document.getElementById('veil');
const ring=document.getElementById('touch-ring');
const status=document.getElementById('load-status');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const gesture=createGesture();
const entries=MODEL_CONFIG.map(config=>({...config,link:document.querySelector(`[data-work="${config.id}"]`),visual:null,ready:false}));
let THREE,renderer,scene,camera,group,dust,raycaster;
let width=0,height=0,distance=0,frame=0,last=0,time=0,floatWorld=null;
let rotX=0,rotY=0,velocityX=0,velocityY=0;
let pressed=null,selected=null,enterAt=0,navigating=false,rotationFrozen=false;
let leaveTimer=0,fadeTimer=0,pointerSampleTime=0;
const scratch={};

function layout(){
  const rect=stage.getBoundingClientRect();
  const changed=width!==rect.width||height!==rect.height;
  width=rect.width;height=rect.height;
  if(changed||!floatWorld)floatWorld=createFloatWorld(width,height);
  distance=fitCamera(width,height);
  if(renderer){
    camera.aspect=width/height;camera.position.set(0,0,distance);camera.updateProjectionMatrix();
    renderer.setSize(width,height);scene.updateMatrixWorld(true);
  }
  placeLinks();requestFrame();
}
function placeLinks(){
  for(const item of entries){
    const fallback=floatingPose(item,0,true,width,height,floatWorld.bodies[entries.indexOf(item)]);
    const basePixels=height/(2*Math.tan(50*Math.PI/360)*distance);
    let x=fallback.x/basePixels,y=fallback.y/basePixels,z=0;
    if(item.pivot){item.pivot.getWorldPosition(scratch.position);({x,y,z}=scratch.position);}
    const pixels=height/(2*Math.tan(50*Math.PI/360)*(distance-z));
    item.link.style.setProperty('--x',`${width/2+x*pixels}px`);
    item.link.style.setProperty('--y',`${height/2-y*pixels}px`);
    item.link.style.setProperty('--size',`${Math.max(44,item.size*1.35*pixels)}px`);
  }
}
function showTouch(x,y){
  ring.style.left=`${x}px`;ring.style.top=`${y}px`;
  ring.getAnimations().forEach(a=>a.cancel());
  ring.animate([{opacity:.9,scale:.65},{opacity:0,scale:1.45}],{duration:motion.matches?100:420,easing:'ease-out'});
}
function pick(x,y){
  if(renderer){
    const rect=stage.getBoundingClientRect();
    scratch.pointer.set((x-rect.left)/width*2-1,-(y-rect.top)/height*2+1);
    scene.updateMatrixWorld(true);raycaster.setFromCamera(scratch.pointer,camera);
    const hits=raycaster.intersectObjects(entries.filter(o=>o.ready).map(o=>o.pickVisual||o.visual),true);
    if(hits.length){let node=hits[0].object;while(node&&!node.userData.work)node=node.parent;return entries.find(o=>o.id===node?.userData.work)||null;}
  }
  // The enlarged target is used for preview images and genuinely tiny models only.
  let best=null,bestDistance=Infinity;
  for(const item of entries){
    const rect=item.link.getBoundingClientRect();
    if(item.ready && rect.width>=60)continue;
    const d=Math.hypot((x-(rect.left+rect.width/2))/(rect.width/2),(y-(rect.top+rect.height/2))/(rect.height/2));
    if(d<=1 && d<bestDistance){best=item;bestDistance=d;}
  }
  return best;
}
function cancelGesture(){
  gesture.cancel();pressed=null;velocityX=0;velocityY=0;
  requestFrame();
}
stage.addEventListener('pointerdown',e=>{
  if(navigating||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  if(e.isPrimary===false){cancelGesture();return;}
  if(!gesture.start(e.pointerId,e.clientX,e.clientY,e.timeStamp))return;
  stage.setPointerCapture(e.pointerId);
  velocityX=0;velocityY=0;pointerSampleTime=e.timeStamp;
  pressed=pick(e.clientX,e.clientY);showTouch(e.clientX,e.clientY);requestFrame();
});
stage.addEventListener('pointermove',e=>{
  const move=gesture.move(e.pointerId,e.clientX,e.clientY);
  if(!move||!move.moved||navigating)return;
  pressed=null;
  const dt=Math.max((e.timeStamp-pointerSampleTime)/1000,1/120);pointerSampleTime=e.timeStamp;
  const dx=move.dx*.0045,dy=move.dy*.0045;
  rotY+=dx;rotX+=dy;
  velocityY=clamp(dx/dt,-2.4,2.4);velocityX=clamp(dy/dt,-2.4,2.4);
  requestFrame();
});
stage.addEventListener('pointerup',e=>{
  const wasActive=gesture.active;
  const tap=gesture.end(e.pointerId,e.clientX,e.clientY,e.timeStamp);
  const target=pressed;pressed=null;
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
  if(tap&&target)enterWork(target);
  else if(wasActive)requestFrame();
});
stage.addEventListener('pointercancel',cancelGesture);
stage.addEventListener('lostpointercapture',()=>{if(gesture.active)cancelGesture();});
window.addEventListener('blur',cancelGesture);
// Pointer navigation is decided by the gesture, never by the synthetic click after dragging.
stage.addEventListener('click',e=>{
  const link=e.target.closest('a[data-work]');
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();
  if(e.detail===0&&link)enterWork(entries.find(o=>o.id===link.dataset.work));
});
for(const item of entries){
  item.link.href=workURL(item.id);
  item.link.addEventListener('focus',()=>{rotationFrozen=true;requestFrame();});
  item.link.addEventListener('blur',()=>{rotationFrozen=false;requestFrame();});
}
function enterWork(item){
  if(navigating||!item)return;
  navigating=true;selected=item;enterAt=performance.now();cancelGesture();
  item.link.setAttribute('aria-current','true');
  const duration=motion.matches?0:520;
  if(!motion.matches)item.link.animate([{scale:1},{scale:1.12}],{duration:300,fill:'forwards',easing:'ease-out'});
  fadeTimer=setTimeout(()=>{veil.style.opacity='1';},motion.matches?0:270);
  leaveTimer=setTimeout(()=>{location.assign(workURL(item.id));},duration);
  requestFrame();
}
function resetEntry(){
  clearTimeout(leaveTimer);clearTimeout(fadeTimer);veil.style.opacity='0';
  navigating=false;selected=null;cancelGesture();
  entries.forEach(o=>{o.link.removeAttribute('aria-current');o.link.getAnimations().forEach(a=>a.cancel());o.visual?.scale.setScalar(1);});
  last=0;layout();
}
window.addEventListener('pageshow',resetEntry);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;cancelGesture();}
  else requestFrame();
});
motion.addEventListener('change',()=>{velocityX=velocityY=0;requestFrame();});
new ResizeObserver(layout).observe(stage);
layout();

async function setup(){
  try{
    const [three,{GLTFLoader},{MeshoptDecoder}]=await Promise.all([
      import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js')
    ]);
    THREE=three;
    // Preview links remain usable if 3D is unavailable or a dependency cannot load.
    const candidate=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});
    renderer=candidate;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(50,width/height,.1,1000);
    group=new THREE.Group();scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff,2));
    for(const [color,intensity,pos] of [[0xffffff,2.8,[60,100,100]],[0xa5c8ff,1.8,[-60,-80,-60]]]){
      const light=new THREE.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);
    }
    const coords=new Float32Array(180*3);
    for(let i=0;i<coords.length;i++)coords[i]=(Math.random()-.5)*450;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(coords,3));
    dust=new THREE.Points(geo,new THREE.PointsMaterial({size:.65,color:0x88aaff,transparent:true,opacity:.22,depthWrite:false}));scene.add(dust);
    raycaster=new THREE.Raycaster();scratch.pointer=new THREE.Vector2();scratch.position=new THREE.Vector3();
    for(const item of entries){
      item.pivot=new THREE.Group();
      const pose=floatingPose(item,0,true,width,height,floatWorld.bodies[entries.indexOf(item)]),pixels=height/(2*Math.tan(50*Math.PI/360)*distance);
      item.pivot.position.set(pose.x/pixels,pose.y/pixels,0);group.add(item.pivot);
      item.link.classList.add('is-loading');
    }
    container.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost',e=>{
      e.preventDefault();cancelAnimationFrame(frame);frame=0;renderer=null;
      entries.forEach(o=>{o.ready=false;o.link.classList.remove('is-ready','is-loading');});
      container.replaceChildren();status.textContent='プレビューから作品に入れます。';placeLinks();
    });
    layout();
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    // Two concurrent loads cap memory pressure while the four previews stay visible.
    const queue=[...entries].sort((a,b)=>['bottle','hand','jisakuhand','frientirip'].indexOf(a.name)-['bottle','hand','jisakuhand','frientirip'].indexOf(b.name));
    async function worker(){
      while(queue.length&&renderer){
        const item=queue.shift();
        try{
          const [gltf,pickGLTF]=await Promise.all([
            loader.loadAsync(`assets/${ASSET_VERSION}/${item.name}.glb`),
            item.name==='jisakuhand'?loader.loadAsync(`assets/${ASSET_VERSION}/${item.name}-pick.glb`).catch(()=>null):Promise.resolve(null)
          ]);
          if(!renderer)break;
          gltf.scene.updateMatrixWorld(true);
          const box=new THREE.Box3().setFromObject(gltf.scene);
          const center=box.getCenter(new THREE.Vector3());const size=box.getSize(new THREE.Vector3());
          // Center inside a scaled parent: translation and geometry receive the same scale.
          const centered=new THREE.Group();centered.add(gltf.scene);centered.position.copy(center).multiplyScalar(-1);
          const normalized=new THREE.Group();normalized.add(centered);normalized.scale.setScalar(item.size/Math.max(size.x,size.y,size.z,1e-8));
          item.visual=new THREE.Group();item.visual.userData.work=item.id;item.visual.add(normalized);item.pivot.add(item.visual);
          if(pickGLTF){
            const pickCenter=new THREE.Group();pickCenter.add(pickGLTF.scene);pickCenter.position.copy(center).multiplyScalar(-1);
            const pickScale=new THREE.Group();pickScale.add(pickCenter);pickScale.scale.copy(normalized.scale);
            item.pickVisual=new THREE.Group();item.pickVisual.userData.work=item.id;item.pickVisual.add(pickScale);
            item.pickVisual.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});}});
            item.pickVisual.visible=false;item.pivot.add(item.pickVisual);
          }
          item.ready=true;item.link.classList.remove('is-loading');
          // Render once before removing its preview to avoid a blank replacement frame.
          scene.updateMatrixWorld(true);renderer.render(scene,camera);item.link.classList.add('is-ready');
          requestFrame();
        }catch(error){item.link.classList.remove('is-loading');console.warn(`Preview retained for ${item.id}:`,error.message);}
      }
    }
    await Promise.all([worker(),worker()]);
    status.textContent='４つの造形から作品を選べます。';
  }catch(error){
    renderer=null;entries.forEach(o=>o.link.classList.remove('is-loading'));
    status.textContent='４つのプレビューから作品を選べます。';
    console.warn('Touch Hands uses previews:',error.message);
  }
}
function requestFrame(){if(renderer&&!frame&&!document.hidden)frame=requestAnimationFrame(animate);}
function animate(now){
  frame=0;if(!renderer||document.hidden)return;
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  const drifting=!motion.matches&&!gesture.active&&!rotationFrozen&&!navigating;
  if(drifting){
    time+=dt;floatWorld.step(dt);
    const x=advanceRotation(rotX,velocityX,dt),y=advanceRotation(rotY,velocityY,dt);
    rotX=x.rotation;velocityX=x.velocity;rotY=y.rotation;velocityY=y.velocity;
  }
  group.rotation.set(0,0,0);
  dust.rotation.y=motion.matches?0:time*.004;
  for(const item of entries){
    const pose=floatingPose(item,time,motion.matches,width,height,floatWorld.bodies[entries.indexOf(item)]);
    const pixels=height/(2*Math.tan(50*Math.PI/360)*(distance-pose.z));
    item.pivot.position.set(pose.x/pixels,pose.y/pixels,pose.z);
    if(item.visual){
      item.visual.rotation.set(pose.rx+rotX,pose.ry+rotY,pose.rz);
      const t=item===selected?clamp((now-enterAt)/300,0,1):0;
      item.visual.scale.setScalar(1+(motion.matches?0:(1-Math.pow(1-t,3))*.12));
      if(item.pickVisual){item.pickVisual.rotation.copy(item.visual.rotation);item.pickVisual.scale.copy(item.visual.scale);}
    }
  }
  scene.updateMatrixWorld(true);placeLinks();renderer.render(scene,camera);
  if(!motion.matches||gesture.active||navigating||Math.abs(velocityX)+Math.abs(velocityY)>.001)requestFrame();
}
setup();
