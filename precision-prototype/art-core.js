// Art core for Precision Prototype

function base(c,w,h,c1,c2){
  const g = c.createLinearGradient(0,-h/2,0,h/2);
  g.addColorStop(0,c1); g.addColorStop(1,c2);
  c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
}
function nudeBase(c,w,h,a){
  const keep=c.globalAlpha; c.globalAlpha=keep*a;
  base(c,w,h,'#f0dcd1','#e5c7b8'); c.globalAlpha=keep;
}
const LOOKS = {
  onecolor:{name:'ワンカラー', paint(c,w,h,col){ base(c,w,h,shade(col,18),shade(col,-14)); }},
  churun:{name:'ちゅるん', paint(c,w,h,col){
    nudeBase(c,w,h,.5);
    const keep=c.globalAlpha; c.globalAlpha=keep*.72;
    base(c,w,h,shade(col,30),shade(col,-2));
    c.globalAlpha=keep*.5;
    const g=c.createRadialGradient(0,h*0.05,0, 0,h*0.05,w*0.75);
    g.addColorStop(0,shade(col,-10)); g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    c.globalAlpha=keep;
  }},
  mizuhikari:{name:'水光マグネット', varLabel:'光の帯の太さ', paint(c,w,h,col,seed,v){
    base(c,w,h,shade(col,-18),shade(col,-38));
    const g=c.createLinearGradient(-w*0.45,h*0.35,w*0.45,-h*0.45);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(Math.max(.02,.48-(v-.5)*.30),hexA(shade(col,85),.9));
    g.addColorStop(Math.min(.98,.55+(v-.5)*.30),hexA(shade(col,110),.7));
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    const rnd=seeded(seed+11);
    c.fillStyle='rgba(255,255,255,.9)';
    for(let i=0;i<14;i++){
      const x=(rnd()-0.5)*w, y=(rnd()-0.5)*h;
      c.beginPath(); c.arc(x,y,w*0.014+rnd()*w*0.012,0,Math.PI*2); c.fill();
    }
  }},
  flash:{name:'フラッシュ', varLabel:'ラメの量', paint(c,w,h,col,seed,v){
    base(c,w,h,shade(col,-5),shade(col,-25));
    const rnd=seeded(seed+29);
    const nF=Math.round(14+v*92);
    const keep=c.globalAlpha;
    for(let i=0;i<nF;i++){
      const x=(rnd()-0.5)*w, y=(rnd()-0.5)*h*1.1, r=rnd()*w*0.03+w*0.008;
      const t=rnd();
      const fl=sparkle(rnd()*6.283, 1.5+rnd()*2.6);
      c.globalAlpha = keep*(0.55+fl*0.45);
      c.fillStyle = fl>0.35 ? 'rgba(255,255,255,.98)'
                 : t>0.66 ? 'rgba(255,255,255,.95)'
                 : t>0.33 ? hexA(shade(col,90),.85) : 'rgba(230,225,255,.7)';
      c.beginPath(); c.arc(x,y,r*(1+fl*0.85),0,Math.PI*2); c.fill();
      if(fl>0.62){          /* 強く光った粒だけ十字に伸ばす */
        const L=r*(2.2+fl*2.6);
        c.globalAlpha=keep*fl*0.85; c.strokeStyle='rgba(255,255,255,.95)';
        c.lineWidth=Math.max(0.6, r*0.32); c.lineCap='round';
        c.beginPath(); c.moveTo(x-L,y); c.lineTo(x+L,y); c.moveTo(x,y-L); c.lineTo(x,y+L); c.stroke();
      }
    }
    c.globalAlpha=keep;
  }},
  chrome:{name:'クロム', paint(c,w,h,col){
    const g=c.createLinearGradient(-w/2,0,w/2,0);
    g.addColorStop(0,shade(col,-30)); g.addColorStop(.22,shade(col,70));
    g.addColorStop(.45,shade(col,-10)); g.addColorStop(.62,shade(col,105));
    g.addColorStop(.82,shade(col,-24)); g.addColorStop(1,shade(col,35));
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    c.fillStyle='rgba(255,255,255,.55)';
    c.fillRect(-w*0.06,-h/2,w*0.05,h*1.2);
  }},
  french:{name:'フレンチ', varLabel:'フレンチの幅', paint(c,w,h,col,seed,v){
    nudeBase(c,w,h,.45);
    c.fillStyle=shade(col,5);
    const e=h*(0.26-v*0.24), m=h*(0.62-v*0.56);   /* v が大きいほど太いフレンチ */
    c.beginPath();
    c.moveTo(-w/2,-e); c.quadraticCurveTo(0,-m,w/2,-e);
    c.lineTo(w/2,-h/2); c.lineTo(-w/2,-h/2); c.closePath(); c.fill();
  }},
  grad:{name:'グラデ', varLabel:'グラデの深さ', paint(c,w,h,col,seed,v){
    nudeBase(c,w,h,.4);
    const g=c.createLinearGradient(0,h/2,0,-h/2);
    g.addColorStop(0,'rgba(240,220,209,.25)');
    g.addColorStop(0.72-v*0.60,hexA(col,.7));   /* v が大きいほど深いグラデ */
    g.addColorStop(1,shade(col,-10));
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
  }},
  aurora:{name:'オーロラ', varLabel:'ヴェールの広さ', paint(c,w,h,col,seed,v){
    nudeBase(c,w,h,.55);
    const keep=c.globalAlpha;
    const veils=[['#ffd9e8',-w*0.2,-h*0.2],['#d3e6ff',w*0.18,h*0.05],['#dff5e1',-w*0.05,h*0.3],[shade(col,55),w*0.1,-h*0.3]];
    veils.forEach(([vc,x,y])=>{
      c.globalAlpha=keep*.4;
      const g=c.createRadialGradient(x,y,0,x,y,w*(0.35+v*0.70));
      g.addColorStop(0,vc); g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    });
    c.globalAlpha=keep;
  }},
  milk:{name:'ミルキー', varLabel:'濃さ', paint(c,w,h,col,seed,v){
    base(c,w,h,'#fdf8f3','#f4e6dc');
    const keep=c.globalAlpha; c.globalAlpha=keep*(0.18+v*0.54);
    base(c,w,h,shade(col,50),shade(col,22));
    c.globalAlpha=keep;
  }},

  sheer:{name:'すけ感', varLabel:'濃さ', paint(c,w,h,col,seed,v){
    nudeBase(c,w,h,.35);
    const k=c.globalAlpha; c.globalAlpha=k*(0.25+v*0.60);
    base(c,w,h,shade(col,40),shade(col,10)); c.globalAlpha=k;
  }},
  frenchmirror:{name:'ミラーフレンチ', varLabel:'フレンチの幅', paint(c,w,h,col,seed,v){
    nudeBase(c,w,h,.5);
    const g=c.createLinearGradient(-w/2,0,w/2,0);
    g.addColorStop(0,shade(col,-28)); g.addColorStop(.28,shade(col,85));
    g.addColorStop(.55,shade(col,-6)); g.addColorStop(.78,shade(col,95)); g.addColorStop(1,shade(col,20));
    c.save();
    const e2=h*(0.25-v*0.24), m2=h*(0.64-v*0.56);
    c.beginPath(); c.moveTo(-w/2,-e2); c.quadraticCurveTo(0,-m2,w/2,-e2);
    c.lineTo(w/2,-h/2); c.lineTo(-w/2,-h/2); c.closePath(); c.clip();
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h);
    c.restore();
  }},
  pearl:{name:'パール', paint(c,w,h,col){
    base(c,w,h,shade(col,48),shade(col,10));
    const g=c.createRadialGradient(-w*0.18,-h*0.22,0,-w*0.18,-h*0.22,w*0.95);
    g.addColorStop(0,'rgba(255,255,255,.7)');
    g.addColorStop(.55,'rgba(255,246,250,.25)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    const rnd=seeded(61);
    for(let i=0;i<26;i++){
      c.fillStyle='rgba(255,255,255,'+(0.22+rnd()*0.38).toFixed(2)+')';
      c.beginPath(); c.arc((rnd()-.5)*w,(rnd()-.5)*h,w*0.012+rnd()*w*0.010,0,Math.PI*2); c.fill();
    }
  }},
  stardust:{name:'スターダスト', varLabel:'ラメの量', paint(c,w,h,col,seed,v){
    nudeBase(c,w,h,.5);
    const g=c.createLinearGradient(0,h/2,0,-h/2);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(.5,hexA(shade(col,20),.55));
    g.addColorStop(1,shade(col,-4));
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    const rnd=seeded(seed+53);
    const nS=Math.round(25+v*140);
    const keep=c.globalAlpha;
    for(let i=0;i<nS;i++){
      const y=(rnd()-.5)*h*1.1;
      const t=(h/2-y)/h;
      if(rnd()>t*0.95+0.05) continue;
      const white = rnd()>.5;
      const x=(rnd()-.5)*w, r=w*0.006+rnd()*w*0.015;
      const fl=sparkle(rnd()*6.283, 1.2+rnd()*2.4);
      c.globalAlpha = keep*(0.5+fl*0.5);
      c.fillStyle = fl>0.4 ? 'rgba(255,255,255,.98)'
                 : white ? 'rgba(255,255,255,.9)' : hexA(shade(col,75),.8);
      c.beginPath(); c.arc(x, y, r*(1+fl*0.9),0,Math.PI*2); c.fill();
    }
    c.globalAlpha=keep;
  }},
  matte:{name:'マット', flat:true, paint(c,w,h,col){
    c.fillStyle=shade(col,-4); c.fillRect(-w/2,-h/2,w,h*1.2);
    const k=c.globalAlpha; c.globalAlpha=k*.16;
    c.fillStyle='#efe7e0'; c.fillRect(-w/2,-h/2,w,h*1.2); c.globalAlpha=k;
  }},
  velvet:{name:'ベルベット', flat:true, paint(c,w,h,col){
    c.fillStyle=shade(col,-26); c.fillRect(-w/2,-h/2,w,h*1.2);
    const g=c.createRadialGradient(0,0,Math.min(w,h)*0.2,0,0,Math.max(w,h)*0.8);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(1,hexA(shade(col,55),.42));
    c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
  }},
  marble:{name:'大理石', varLabel:'模様の量', paint(c,w,h,col,seed,v){
    base(c,w,h,shade(col,66),shade(col,40));
    const vein=(seed,color,wid,n)=>{
      const rnd=seeded(seed); c.strokeStyle=color; c.lineCap='round'; c.lineJoin='round';
      n=Math.max(1, Math.round(n*(0.4+v*1.2)));
      for(let i=0;i<n;i++){
        c.lineWidth=wid*(0.5+rnd());
        let x=(rnd()-.5)*w*1.2, y=-h*0.6;
        c.beginPath(); c.moveTo(x,y);
        for(let k2=0;k2<6;k2++){ x+=(rnd()-.5)*w*0.5; y+=h*0.22; c.lineTo(x,y); }
        c.stroke();
      }
    };
    vein(7,  hexA(shade(col,-55),.60), w*0.032, 3);
    vein(23, hexA(shade(col,-15),.40), w*0.018, 4);
    vein(41, 'rgba(200,168,106,.7)',   w*0.010, 2);
  }},
  nuance:{name:'ニュアンス', paint(c,w,h,col){
    base(c,w,h,shade(col,44),shade(col,14));
    const rnd=seeded(13);
    for(let i=0;i<3;i++){
      const x=(rnd()-.5)*w*0.8, y=(rnd()-.5)*h*0.8, r=w*(0.30+rnd()*0.35);
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,hexA(shade(col,-28),.55)); g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    }
    c.strokeStyle='rgba(214,178,102,.9)'; c.lineWidth=w*0.022; c.lineCap='round';
    c.beginPath(); c.moveTo(-w*0.30,h*0.06); c.quadraticCurveTo(0,-h*0.12,w*0.28,h*0.20); c.stroke();
  }},
  bekko:{name:'べっ甲', varLabel:'斑の大きさ', paint(c,w,h,col,seed,v){
    base(c,w,h,shade(col,52),shade(col,4));
    const rnd=seeded(7);
    for(let i=0;i<9;i++){
      const x=(rnd()-.5)*w, y=(rnd()-.5)*h, r=w*(0.13+rnd()*0.28)*(0.5+v);
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,hexA(shade(col,-72),.9));
      g.addColorStop(.6,hexA(shade(col,-45),.35));
      g.addColorStop(1,hexA(shade(col,-45),0));
      c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    }
    const k=c.globalAlpha; c.globalAlpha=k*.16;      /* べっ甲らしい飴色をひと匙 */
    base(c,w,h,'#e8bd74','#a9682a'); c.globalAlpha=k;
  }},
  check:{name:'チェック', varLabel:'チェックの細かさ', paint(c,w,h,col,seed,v){
    base(c,w,h,'#fdf7f0','#f4e8dc');
    const k=c.globalAlpha;
    const sx=w*(0.40-v*0.32), sy=h*(0.37-v*0.30), nn=Math.ceil(0.6/Math.max(0.08,(0.40-v*0.32)));
    c.globalAlpha=k*.45; c.fillStyle=shade(col,20);
    for(let i=-nn;i<=nn;i++){
      c.fillRect(i*sx-w*0.05,-h*0.6,w*0.10,h*1.2);
      c.fillRect(-w/2,i*sy-h*0.03,w,h*0.075);
    }
    c.globalAlpha=k*.85; c.fillStyle=shade(col,-16);
    for(let i=-nn;i<=nn;i++){
      c.fillRect(i*sx-w*0.010,-h*0.6,w*0.020,h*1.2);
      c.fillRect(-w/2,i*sy-h*0.006,w,h*0.013);
    }
    c.globalAlpha=k;
  }},
  line:{name:'ワイヤー', varLabel:'線の太さ', paint(c,w,h,col,seed,v){
    nudeBase(c,w,h,.75);
    const k=c.globalAlpha; c.globalAlpha=k*.5;
    base(c,w,h,shade(col,50),shade(col,26)); c.globalAlpha=k;
    c.strokeStyle='#d8b46a'; c.lineWidth=w*(0.008+v*0.028); c.lineCap='round';
    c.beginPath(); c.moveTo(-w*0.34,-h*0.24);
    c.bezierCurveTo(w*0.10,-h*0.05,-w*0.20,h*0.16,w*0.32,h*0.30); c.stroke();
    c.beginPath(); c.moveTo(-w*0.30,h*0.06);
    c.quadraticCurveTo(0,h*0.30,w*0.30,-h*0.02); c.stroke();
    c.fillStyle='#fff'; c.beginPath(); c.arc(w*0.10,-h*0.02,w*0.045,0,Math.PI*2); c.fill();
  }},
  shell:{name:'シェル', paint(c,w,h,col){
    base(c,w,h,shade(col,52),shade(col,20));
    const rnd=seeded(31);
    for(let i=0;i<16;i++){
      const x=(rnd()-.5)*w*0.95, y=(rnd()-.5)*h, r=w*(0.07+rnd()*0.14), a=rnd()*Math.PI;
      c.save(); c.translate(x,y); c.rotate(a);
      const g=c.createLinearGradient(-r,0,r,0);
      const pal=['#ffd9ea','#d7ecff','#e5ffe9','#fff2cf'][Math.floor(rnd()*4)];
      g.addColorStop(0,'rgba(255,255,255,.9)');
      g.addColorStop(.5,pal);
      g.addColorStop(1,'rgba(255,255,255,.25)');
      c.fillStyle=g; c.beginPath(); c.ellipse(0,0,r,r*0.6,0,0,Math.PI*2); c.fill();
      c.restore();
    }
  }},
  sourceform:{name:'採集した線', material:true, varLabel:'線の密度', paint(c,w,h,col,seed,v){
    const p=sourceProfile;
    if(!p){ base(c,w,h,shade(col,48),shade(col,15)); return; }
    base(c,w,h,p.palette[4]||shade(col,55),p.palette[1]||shade(col,10));
    const keep=c.globalAlpha, rnd=seeded(seed+97);
    c.save();
    /* 写真の色彩による柔らかな下地滲み */
    for(let i=0;i<4;i++){
      const mx=(rnd()-.5)*w*0.8, my=(rnd()-.5)*h*0.8;
      const mg=c.createRadialGradient(mx,my,0,mx,my,w*0.45);
      mg.addColorStop(0,hexA(p.palette[(i+3)%p.palette.length]||col,0.28));
      mg.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=mg; c.fillRect(-w/2,-h/2,w,h*1.2);
    }
    c.rotate(p.angle);
    /* 採集した線の方向ベクトルに沿った、65本以上の極細ストローク */
    const count=Math.round(24+(p.density*0.6+v*0.4)*45);
    c.lineCap='round'; c.lineJoin='round';
    for(let i=0;i<count;i++){
      const y=(i/(Math.max(1,count-1))-.5)*h*1.4+(rnd()-.5)*h*.12;
      const strokeCol=p.palette[(i+2)%p.palette.length]||col;
      c.globalAlpha=keep*(0.25+rnd()*0.62);
      c.strokeStyle=strokeCol;
      c.lineWidth=Math.max(0.4, w*(0.005+rnd()*0.022));
      c.beginPath();
      c.moveTo(-w*0.9, y);
      const b1=(rnd()-.5)*h*0.18, b2=(rnd()-.5)*h*0.18;
      c.bezierCurveTo(-w*0.3, y+b1, w*0.3, y+b2, w*0.9, y+(rnd()-.5)*h*0.06);
      c.stroke();
    }
    /* 金属光沢の極細アクセントライン（写真から採集した主線） */
    c.strokeStyle='rgba(255,248,220,0.75)'; c.lineWidth=Math.max(0.4, w*0.007);
    c.beginPath(); c.moveTo(-w*0.85, 0); c.bezierCurveTo(-w*0.2, h*0.1, w*0.2, -h*0.1, w*0.85, 0); c.stroke();
    c.restore(); c.globalAlpha=keep;
  }},
  sourcefield:{name:'採集した形', material:true, varLabel:'形の密度', paint(c,w,h,col,seed,v){
    const p=sourceProfile;
    if(!p){ base(c,w,h,shade(col,36),shade(col,4)); return; }
    base(c,w,h,p.palette[5]||shade(col,65),p.palette[0]||col);
    const keep=c.globalAlpha, pts=p.points||[], n=Math.min(48,Math.max(16,Math.round(18+v*30)));
    const rnd=seeded(seed+127);
    c.save();
    /* 写真の特徴点から採集された多層モザイク・鉱物パッチ */
    for(let i=0;i<n;i++){
      const pt=pts[(i*3+seed)%Math.max(1,pts.length)]||{x:(i%5)/4,y:(i%7)/6,m:0.5};
      const x=(pt.x-.5)*w*1.15, y=(pt.y-.5)*h*1.15;
      const r=w*(0.03+0.12*pt.m)*(0.7+v*0.6);
      const patchCol=p.palette[(i+seed)%p.palette.length]||col;
      c.globalAlpha=keep*(0.22+pt.m*0.58);
      c.save(); c.translate(x,y); c.rotate(p.angle+(i%4)*0.45);
      /* 立体的な多角形・オーバル・鉱物カット */
      if(i%3===0){
        c.fillStyle=patchCol;
        c.beginPath(); c.moveTo(-r, 0); c.lineTo(0, -r*1.3); c.lineTo(r, 0); c.lineTo(0, r*1.3); c.closePath(); c.fill();
        c.strokeStyle='rgba(255,255,255,0.4)'; c.lineWidth=Math.max(0.3, w*0.005); c.stroke();
      } else if(i%3===1){
        const mg=c.createRadialGradient(0,0,0,0,0,r);
        mg.addColorStop(0, hexA(shade(patchCol, 25), 0.85));
        mg.addColorStop(0.7, patchCol);
        mg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle=mg;
        c.beginPath(); c.ellipse(0, 0, r, r*(0.4+0.35*pt.m), rnd()*0.8, 0, Math.PI*2); c.fill();
      } else {
        c.fillStyle=hexA(shade(patchCol, 45), 0.75);
        c.beginPath(); c.arc(0, 0, Math.max(0.5, r*0.6), 0, Math.PI*2); c.fill();
      }
      c.restore();
    }
    c.restore(); c.globalAlpha=keep;
  }},
  sourceglow:{name:'採集した光', material:true, varLabel:'光の量', paint(c,w,h,col,seed,v){
    const p=sourceProfile;
    if(!p){ base(c,w,h,shade(col,-6),shade(col,-30)); return; }
    base(c,w,h,shade(p.palette[0]||col,-22),shade(p.palette[2]||col,-48));
    const keep=c.globalAlpha, rnd=seeded(seed+151);
    c.save();
    /* 写真のハイライト色による深層オーロラ・ネビュラ */
    const count=Math.round(8+v*18+p.light*15);
    for(let i=0;i<count;i++){
      const x=(rnd()-.5)*w*1.1, y=(rnd()-.5)*h*1.1, r=w*(0.10+rnd()*0.28);
      const g=c.createRadialGradient(x,y,0,x,y,r);
      const pc=p.palette[(i+3)%p.palette.length]||'#fff';
      g.addColorStop(0,hexA(shade(pc,90),0.85));
      g.addColorStop(0.35,hexA(pc,0.40));
      g.addColorStop(1,'rgba(0,0,0,0)');
      c.globalAlpha=keep*(0.35+sparkle(rnd()*6.28,1.2+rnd()*2.2)*0.55);
      c.fillStyle=g; c.fillRect(-w/2,-h/2,w,h*1.2);
    }
    /* 45個の微細な星辰・光子粒子 */
    c.globalCompositeOperation='screen';
    for(let i=0;i<45;i++){
      const px=(rnd()-.5)*w*0.88, py=(rnd()-.5)*h*0.92;
      const pSize=Math.max(0.35, w*(0.004+rnd()*0.015));
      const spCol=p.palette[(i*2)%p.palette.length]||'#fff';
      c.globalAlpha=keep*(0.4+rnd()*0.6);
      c.fillStyle=i%3===0?'#ffffff':hexA(shade(spCol,80),0.9);
      c.beginPath(); c.arc(px,py,pSize,0,Math.PI*2); c.fill();
    }
    c.restore(); c.globalAlpha=keep;
  }},
};

/* ================= マイデザイン（自作を乗せる） ================= */
const customLooks = [];   // {name, img}
const DESIGN_KEY = 'tsuya.designs';
(function loadSavedDesigns(){
  let arr=[]; try{ arr=JSON.parse(localStorage.getItem(DESIGN_KEY)||'[]'); }catch(e){}
  arr.forEach(d=>{
    const img=new Image();
    img.onload=()=>{ try{ buildLooks(); }catch(e){} };
    img.src=d.data;
    customLooks.push({name:d.name, img});
  });
})();
/* 指ごとのデザイン（親指→小指）。targetFinger が -1 なら「すべて」 */
const FINGER_NAMES = ['親','人','中','薬','小'];
const nailLooks = ['onecolor','onecolor','onecolor','onecolor','onecolor'];
const nailColors = ['#b76e79','#b76e79','#b76e79','#b76e79','#b76e79'];
let targetFinger = -1;
/* 柄のつまみ：デザインごとに 0〜1 を憶える（既定 0.5 = 元の見た目） */
const lookVar = {};
const varOf = key => (key in lookVar) ? lookVar[key] : 0.5;

function paintLook(c,w,h,col,seed){ paintByKey(c,currentLook,w,h,col,seed); }
function paintByKey(c,key,w,h,col,seed){
  if(!key || (!LOOKS[key] && !key.startsWith('custom:'))) key='onecolor';
  if(key.startsWith('custom:')){
    const cl = customLooks[+key.slice(7)];
    if(cl) drawCover(c, cl.img, w, h);
    else base(c,w,h,shade(col,18),shade(col,-14));
    return;
  }
  LOOKS[key].paint(c,w,h,col,seed,varOf(key));
}
function getFoilWireProfile(lookKey){
  if(!lookKey) return { foil: 1, wire: 1 };
  if(flatLook(lookKey)) return { foil: 0, wire: 0 };
  /* 無地系・シアー系：ノイズを排除し、滑らかな発色と透明感を優先（完全にゼロ） */
  const zeroLooks = ['onecolor', 'sheer', 'churun', 'matte', 'velvet', 'french', 'milk', 'artTrace', 'artThinking'];
  if(zeroLooks.includes(lookKey)) return { foil: 0, wire: 0 };
  /* 繊細・微光系：線はゼロ、微細な箔のみごく微量に沈める */
  const subtleLooks = ['grad', 'pearl', 'frenchmirror'];
  if(subtleLooks.includes(lookKey)) return { foil: 0.28, wire: 0 };
  /* アート・テクスチャ・作品系：しっかりと箔と極細線を活かす */
  return { foil: 1.0, wire: 1.0 };
}
/* 柄の上にだけ重ねる、チップの断面・甘皮側の影・ジェル反射。
   呼び出し側で爪の形にクリップしてから使うため、柄の外へは出ない。 */
function paintGelTip(c,w,h,seed,gloss=1,lookKey=null){
  const keep=c.globalAlpha, rnd=seeded(seed+71);
  const profile=getFoilWireProfile(lookKey);
  const isFlat=flatLook(lookKey);
  c.save();
  const side=c.createLinearGradient(-w*.5,0,w*.5,0);
  side.addColorStop(0,'rgba(29,17,18,.25)'); side.addColorStop(.10,'rgba(255,245,242,.055)');
  side.addColorStop(.50,'rgba(255,255,255,0)'); side.addColorStop(.90,'rgba(255,246,241,.07)'); side.addColorStop(1,'rgba(29,17,18,.28)');
  c.globalAlpha=keep*.72; c.fillStyle=side; c.fillRect(-w*.55,-h*.62,w*1.1,h*1.25);
  const cuticle=c.createLinearGradient(0,h*.16,0,h*.58);
  cuticle.addColorStop(0,'rgba(74,38,33,0)'); cuticle.addColorStop(1,'rgba(40,20,18,.30)');
  c.globalAlpha=keep*.68; c.fillStyle=cuticle; c.fillRect(-w*.55,h*.12,w*1.1,h*.5);
  const edge=c.createLinearGradient(0,-h*.58,0,-h*.26);
  edge.addColorStop(0,'rgba(255,255,255,.22)'); edge.addColorStop(.55,'rgba(255,239,232,.055)'); edge.addColorStop(1,'rgba(255,255,255,0)');
  c.globalAlpha=keep*.62; c.fillStyle=edge; c.fillRect(-w*.5,-h*.6,w,h*.38);
  if(gloss>.04 && !isFlat){
    const shine=c.createLinearGradient(-w*.36,-h*.48,w*.28,h*.30);
    shine.addColorStop(0,'rgba(255,255,255,0)'); shine.addColorStop(.38,'rgba(255,255,255,.05)');
    shine.addColorStop(.52,'rgba(255,255,255,.31)'); shine.addColorStop(.64,'rgba(255,255,255,.045)'); shine.addColorStop(1,'rgba(255,255,255,0)');
    c.globalAlpha=keep*Math.min(.55,.16+gloss*.34); c.fillStyle=shine; c.fillRect(-w*.5,-h*.58,w,h*1.14);
    c.globalAlpha=keep*(.10+gloss*.16); c.fillStyle='rgba(255,255,255,.9)';
    for(let i=0;i<2;i++){ const x=(rnd()-.5)*w*.48, y=(-.18+rnd()*.36)*h; c.fillRect(x,y,Math.max(.7,w*.018),Math.max(1.2,h*.035)); }
  }
  /* デザイン属性に連動した、透明なジェルの下に沈んだ極細線と箔。
     無地・シアー系ではゼロになり、余計なノイズやゴミ感を完全に防ぐ。 */
  if(profile.wire > 0){
    c.globalAlpha=keep*(.10+Math.min(.15,gloss*.12))*profile.wire;
    c.lineCap='round'; c.lineJoin='round'; c.lineWidth=Math.max(.42,w*.012);
    for(let i=0;i<3;i++){
      const x0=(rnd()-.5)*w*.82, y0=(rnd()-.5)*h*.88;
      const x1=(rnd()-.5)*w*.72, y1=(rnd()-.5)*h*.82;
      c.strokeStyle=i===1?'rgba(255,252,246,.9)':'rgba(214,178,111,.92)';
      c.beginPath(); c.moveTo(x0,y0);
      c.quadraticCurveTo((x0+x1)*.5+(rnd()-.5)*w*.25,(y0+y1)*.5+(rnd()-.5)*h*.18,x1,y1); c.stroke();
    }
  }
  if(profile.foil > 0){
    const foilCount = profile.foil < 0.5 ? 2 : 7;
    c.globalAlpha=keep*(.10+Math.min(.15,gloss*.12))*profile.foil;
    for(let i=0;i<foilCount;i++){
      const x=(rnd()-.5)*w*.78, y=(rnd()-.5)*h*.92, s=Math.max(.55,w*(.010+rnd()*.018));
      c.fillStyle=i%3===0?'rgba(232,205,142,.9)':'rgba(255,255,255,.78)';
      c.save(); c.translate(x,y); c.rotate(rnd()*Math.PI); c.fillRect(-s,-s*.42,s*2,s*.84); c.restore();
    }
  }
  c.restore();
}
/* サロンのプロフェッショナル・オーバルアーモンドフォルムの精密ベジェ曲線 */
function nailShapeSpecimen(c,w,h){
  const baseY = h * 0.42;
  c.beginPath();
  c.moveTo(-w*0.48, baseY);
  /* キューティクル（根元）側の優美なラウンド */
  c.bezierCurveTo(-w*0.48, h*0.53, -w*0.25, h*0.56, 0, h*0.56);
  c.bezierCurveTo(w*0.25, h*0.56, w*0.48, h*0.53, w*0.48, baseY);
  /* サイドストレートから先端へのなだらかな絞り込み */
  c.bezierCurveTo(w*0.49, h*0.06, w*0.46, -h*0.24, w*0.36, -h*0.42);
  /* 先端（フリーエッジ）の美しいCアーチ */
  c.bezierCurveTo(w*0.22, -h*0.55, -w*0.22, -h*0.55, -w*0.36, -h*0.42);
  c.bezierCurveTo(-w*0.46, -h*0.24, -w*0.49, h*0.06, -w*0.48, baseY);
  c.closePath();
}

/* 写真のような10倍の緻密さを持つスタジオ標本レンダラー */
function paintPhotographicSpecimen(c, w, h, look, color, seed, gloss=0.96){
  const isFlat = flatLook(look);
  c.save();

  // 1. 標本台の多層アンビエントシャドウ（チップの下に落ちるリアルな写真影）
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.36)';
  c.shadowBlur = w * 0.22;
  c.shadowOffsetX = 0;
  c.shadowOffsetY = h * 0.05;
  c.fillStyle = 'rgba(12,8,10,0.7)';
  nailShapeSpecimen(c, w, h);
  c.fill();
  c.restore();

  // 2. チップ本体のクリッピングとアート描画
  c.save();
  nailShapeSpecimen(c, w, h);
  c.clip();

  // ベース・アート描画
  paintByKey(c, look, w, h, color, seed);

  // デザイン属性連動のジェルレイヤー（箔・線・キューティクル段差）
  paintGelTip(c, w, h, seed, gloss, look);

  // 3. トップジェルの立体ドーム（ハイポイントとCカーブの厚み）
  const dome = c.createRadialGradient(0, -h*0.06, w*0.10, 0, -h*0.06, w*0.54);
  dome.addColorStop(0, 'rgba(255,255,255,0.07)');
  dome.addColorStop(0.62, 'rgba(0,0,0,0)');
  dome.addColorStop(1, 'rgba(18,8,6,0.26)');
  c.fillStyle = dome;
  c.fillRect(-w*0.6, -h*0.65, w*1.2, h*1.3);

  // 4. 写真撮影時のスタジオ照明（ソフトボックスの澄んだ縦ハイライト）
  if(!isFlat && gloss > 0.1){
    const softbox = c.createLinearGradient(-w*0.36, -h*0.52, -w*0.06, h*0.38);
    softbox.addColorStop(0, 'rgba(255,255,255,0)');
    softbox.addColorStop(0.30, 'rgba(255,255,255,0.06)');
    softbox.addColorStop(0.46, 'rgba(255,255,255,0.76)');
    softbox.addColorStop(0.52, 'rgba(255,255,255,0.88)');
    softbox.addColorStop(0.58, 'rgba(255,255,255,0.20)');
    softbox.addColorStop(0.74, 'rgba(255,255,255,0.03)');
    softbox.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = Math.min(0.88, 0.45 + gloss * 0.42);
    c.fillStyle = softbox;
    c.fillRect(-w*0.55, -h*0.6, w*1.1, h*1.2);

    // 先端フリーエッジのガラス光沢
    const tipGlow = c.createRadialGradient(0, -h*0.44, 0, 0, -h*0.44, w*0.32);
    tipGlow.addColorStop(0, 'rgba(255,255,255,0.68)');
    tipGlow.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    tipGlow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = tipGlow;
    c.fillRect(-w*0.5, -h*0.56, w, h*0.26);

    // 右側アンビエント反射光
    const subRim = c.createLinearGradient(w*0.24, 0, w*0.48, 0);
    subRim.addColorStop(0, 'rgba(255,255,255,0)');
    subRim.addColorStop(1, 'rgba(255,255,255,0.28)');
    c.fillStyle = subRim;
    c.fillRect(w*0.2, -h*0.5, w*0.3, h);
  } else if(isFlat){
    // マット・ベルベットの微粒子質感
    const matteGlow = c.createRadialGradient(0, -h*0.05, 0, 0, -h*0.05, w*0.5);
    matteGlow.addColorStop(0, 'rgba(255,255,255,0.07)');
    matteGlow.addColorStop(0.7, 'rgba(255,255,255,0.02)');
    matteGlow.addColorStop(1, 'rgba(0,0,0,0.18)');
    c.fillStyle = matteGlow;
    c.fillRect(-w*0.6, -h*0.65, w*1.2, h*1.3);
  }
  c.restore();

  // 5. 写真のような「全周クリアジェルのガラス境界線（Rim Edge Reflection）」
  c.save();
  nailShapeSpecimen(c, w, h);
  c.lineWidth = Math.max(0.75, w * 0.016);
  if(!isFlat){
    const edgeGrad = c.createLinearGradient(-w*0.4, -h*0.5, w*0.4, h*0.5);
    edgeGrad.addColorStop(0, 'rgba(255,255,255,0.78)');
    edgeGrad.addColorStop(0.35, 'rgba(255,255,255,0.36)');
    edgeGrad.addColorStop(0.7, 'rgba(255,255,255,0.14)');
    edgeGrad.addColorStop(1, 'rgba(255,255,255,0.56)');
    c.strokeStyle = edgeGrad;
    c.globalAlpha = 0.68;
  } else {
    c.strokeStyle = 'rgba(255,255,255,0.16)';
    c.globalAlpha = 0.38;
  }
  c.stroke();
  c.restore();

  c.restore();
}
