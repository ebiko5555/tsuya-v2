const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');

const profile = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outPrefix = process.argv[3];
const sparkT = 1.37;
const vars = profile.vars;

function rgb2hex(r,g,b){
  const c=v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0');
  return '#'+c(r)+c(g)+c(b);
}
function shade(hex,amt){ const n=parseInt(hex.slice(1),16); return rgb2hex((n>>16)+amt,(n>>8&255)+amt,(n&255)+amt); }
function hexA(hex,a){ const n=parseInt(hex.slice(1),16); return `rgba(${n>>16},${n>>8&255},${n&255},${a})`; }
function seeded(seed){ let s=seed*9301+49297; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
function sparkle(ph,sp){ const u=Math.sin(sparkT*sp+ph); return u<=0?0:(u*u)*(u*u); }
function base(c,w,h,c1,c2){ const g=c.createLinearGradient(0,-h/2,0,h/2); g.addColorStop(0,c1);g.addColorStop(1,c2);c.fillStyle=g;c.fillRect(-w/2,-h/2,w,h*1.2); }
function nudeBase(c,w,h,a){ const keep=c.globalAlpha;c.globalAlpha=keep*a;base(c,w,h,'#f0dcd1','#e5c7b8');c.globalAlpha=keep; }

const LOOKS = {
  onecolor(c,w,h,col){ base(c,w,h,shade(col,18),shade(col,-14)); },
  matte(c,w,h,col){ c.fillStyle=shade(col,-4);c.fillRect(-w/2,-h/2,w,h*1.2);const k=c.globalAlpha;c.globalAlpha=k*.16;c.fillStyle='#efe7e0';c.fillRect(-w/2,-h/2,w,h*1.2);c.globalAlpha=k; },
  sheer(c,w,h,col,seed,v){ nudeBase(c,w,h,.35);const k=c.globalAlpha;c.globalAlpha=k*(.25+v*.60);base(c,w,h,shade(col,40),shade(col,10));c.globalAlpha=k; },
  pearl(c,w,h,col){
    base(c,w,h,shade(col,48),shade(col,10));
    const g=c.createRadialGradient(-w*.18,-h*.22,0,-w*.18,-h*.22,w*.95);
    g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(.55,'rgba(255,246,250,.25)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(-w/2,-h/2,w,h*1.2);const rnd=seeded(61);
    for(let i=0;i<26;i++){c.fillStyle=`rgba(255,255,255,${(0.22+rnd()*.38).toFixed(2)})`;c.beginPath();c.arc((rnd()-.5)*w,(rnd()-.5)*h,w*.012+rnd()*w*.010,0,Math.PI*2);c.fill();}
  },
  stardust(c,w,h,col,seed,v){
    nudeBase(c,w,h,.5);const g=c.createLinearGradient(0,h/2,0,-h/2);
    g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,hexA(shade(col,20),.55));g.addColorStop(1,shade(col,-4));c.fillStyle=g;c.fillRect(-w/2,-h/2,w,h*1.2);
    const rnd=seeded(seed+53),n=Math.round(25+v*140),keep=c.globalAlpha;
    for(let i=0;i<n;i++){const y=(rnd()-.5)*h*1.1,t=(h/2-y)/h;if(rnd()>t*.95+.05)continue;const white=rnd()>.5,x=(rnd()-.5)*w,r=w*.006+rnd()*w*.015,fl=sparkle(rnd()*6.283,1.2+rnd()*2.4);c.globalAlpha=keep*(.5+fl*.5);c.fillStyle=fl>.4?'rgba(255,255,255,.98)':white?'rgba(255,255,255,.9)':hexA(shade(col,75),.8);c.beginPath();c.arc(x,y,r*(1+fl*.9),0,Math.PI*2);c.fill();}
    c.globalAlpha=keep;
  },
  line(c,w,h,col,seed,v){
    nudeBase(c,w,h,.75);const k=c.globalAlpha;c.globalAlpha=k*.5;base(c,w,h,shade(col,50),shade(col,26));c.globalAlpha=k;
    c.strokeStyle='#d8b46a';c.lineWidth=w*(.008+v*.028);c.lineCap='round';c.beginPath();c.moveTo(-w*.34,-h*.24);c.bezierCurveTo(w*.10,-h*.05,-w*.20,h*.16,w*.32,h*.30);c.stroke();c.beginPath();c.moveTo(-w*.30,h*.06);c.quadraticCurveTo(0,h*.30,w*.30,-h*.02);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(w*.10,-h*.02,w*.045,0,Math.PI*2);c.fill();
  },
  sourceform(c,w,h,col,seed,v){
    base(c,w,h,profile.palette[4]||shade(col,55),profile.palette[1]||shade(col,10));
    const keep=c.globalAlpha,rnd=seeded(seed+97),count=Math.round(4+(profile.density*.55+v*.45)*18);
    c.save();c.rotate(profile.angle);c.lineCap='round';c.lineJoin='round';
    for(let i=0;i<count;i++){const y=(i/Math.max(1,count-1)-.5)*h*1.35+(rnd()-.5)*h*.10;c.globalAlpha=keep*(.28+rnd()*.58);c.strokeStyle=profile.palette[(i+2)%profile.palette.length]||col;c.lineWidth=w*(.008+rnd()*.035);c.beginPath();c.moveTo(-w*.85,y);c.bezierCurveTo(-w*.28,y+(rnd()-.5)*h*.20,w*.18,y+(rnd()-.5)*h*.22,w*.85,y+(rnd()-.5)*h*.08);c.stroke();}
    c.restore();c.globalAlpha=keep;
  },
  sourcefield(c,w,h,col,seed,v){
    base(c,w,h,profile.palette[5]||shade(col,65),profile.palette[0]||col);
    const keep=c.globalAlpha,pts=profile.point_data||[],n=Math.min(24,Math.max(7,Math.round(7+v*17)));
    for(let i=0;i<n;i++){const pt=pts[(i*3+seed)%Math.max(1,pts.length)]||{x:(i%4)/3,y:(i%6)/5,m:.5};const x=(pt.x-.5)*w*1.2,y=(pt.y-.5)*h*1.1,r=w*(.05+.16*pt.m)*(.75+v*.6);c.globalAlpha=keep*(.34+pt.m*.52);c.fillStyle=profile.palette[(i+seed)%profile.palette.length]||col;c.save();c.translate(x,y);c.rotate(profile.angle+(i%3)*.55);c.beginPath();if(i%3===0){c.moveTo(-r,0);c.lineTo(0,-r*1.5);c.lineTo(r,0);c.lineTo(0,r*1.5);c.closePath();}else c.ellipse(0,0,r,r*(.38+.42*pt.m),0,0,Math.PI*2);c.fill();c.restore();}
    c.globalAlpha=keep;
  },
  sourceglow(c,w,h,col,seed,v){
    base(c,w,h,shade(profile.palette[0]||col,-18),shade(profile.palette[2]||col,-42));
    const keep=c.globalAlpha,rnd=seeded(seed+151),count=Math.round(5+v*16+profile.light*12);
    for(let i=0;i<count;i++){const x=(rnd()-.5)*w,y=(rnd()-.5)*h,r=w*(.06+rnd()*.19),g=c.createRadialGradient(x,y,0,x,y,r),pc=profile.palette[(i+3)%profile.palette.length]||'#fff';g.addColorStop(0,hexA(shade(pc,95),.88));g.addColorStop(.35,hexA(pc,.38));g.addColorStop(1,hexA(pc,0));c.globalAlpha=keep*(.45+sparkle(rnd()*6.28,1.2+rnd()*2.2)*.55);c.fillStyle=g;c.fillRect(-w/2,-h/2,w,h*1.2);}
    c.globalAlpha=keep;
  },
};

const recipes = [
  ['ruten',['sourcefield','sourceform','sourcefield','sourceglow','onecolor']],
  ['keiso',['sourceform','sheer','sourcefield','stardust','onecolor']],
  ['zanko',['sourcefield','line','sourceglow','pearl','matte']],
];
function colorsFor(idx){const p=(profile.paletteVariants&&profile.paletteVariants[idx])||profile.palette;return [p[idx%p.length],p[(idx+3)%p.length],p[(idx+1)%p.length],p[(idx+4)%p.length],p[(idx+2)%p.length]];}
function paintByKey(c,key,w,h,col,seed){LOOKS[key](c,w,h,col,seed,vars[key]??.5);}

recipes.forEach(([name,looks],idx)=>{
  const activePalette=(profile.paletteVariants&&profile.paletteVariants[idx])||profile.palette;
  profile.palette=activePalette;
  const S=4,canvas=createCanvas(200*S,76*S),c=canvas.getContext('2d'),colors=colorsFor(idx);
  c.clearRect(0,0,canvas.width,canvas.height);
  looks.forEach((look,i)=>{
    const heights=[48,58,63,58,50],x=(20+i*42)*S,w=24*S,h=heights[i]*S,baseY=h*.28;
    c.save();c.translate(x,canvas.height/2+3*S);c.beginPath();c.moveTo(-w/2,baseY);c.bezierCurveTo(-w/2,-h*.26,-w*.32,-h*.50,0,-h*.50);c.bezierCurveTo(w*.32,-h*.50,w/2,-h*.26,w/2,baseY);c.bezierCurveTo(w/2,h*.48,w*.28,h*.56,0,h*.56);c.bezierCurveTo(-w*.28,h*.56,-w/2,h*.48,-w/2,baseY);c.closePath();c.clip();paintByKey(c,look,w,h,colors[i],i+11);c.restore();
  });
  fs.writeFileSync(`${outPrefix}-${name}.png`,canvas.toBuffer('image/png'));
});
