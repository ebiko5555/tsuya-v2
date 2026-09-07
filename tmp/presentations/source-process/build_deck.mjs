import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/tsuya-v2-deploy/output/presentation/艶II_SOURCE_写真からネイルへ_制作過程発表.pptx";
const PREVIEW = "/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/tsuya-v2-deploy/tmp/presentations/source-process/rendered";
const A = "/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/tsuya-v2-deploy/tmp/pdfs/assets";
const APP = "/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/tsuya-v2-deploy/experience-prototype/index.html";
const PASTED = "/Users/imafukuemiko/.codex/attachments/cd087418-b6c9-4d19-942e-3f5aace1da53/pasted-text.txt";

const C = {
  bg: "#F7F6F2", ink: "#171717", muted: "#66635E", line: "#C8C3B8",
  panel: "#EAE7E0", gold: "#B58A32", pink: "#C74872", mint: "#62AAA5",
  violet: "#8D70B5", white: "#FFFFFF", black: "#08090B",
};
const FONT = "Hiragino Sans";
const SERIF = "Hiragino Mincho ProN";
const assetBytes = new Map();

function box(slide, x, y, w, h, fill=C.panel, line="none", radius="rect") {
  return slide.shapes.add({
    geometry: radius,
    position: { left:x, top:y, width:w, height:h },
    fill,
    line: { style:"solid", fill: line, width: line==="none"?0:1 },
  });
}

function txt(slide, text, x, y, w, h, size=22, color=C.ink, bold=false, align="left", family=FONT) {
  const s=slide.shapes.add({
    geometry:"textbox", position:{left:x,top:y,width:w,height:h}, fill:"none",
    line:{style:"solid",fill:"none",width:0},
  });
  s.text=text;
  s.text.style={fontSize:size,color,bold,alignment:align,typeface:family,verticalAlignment:"middle",autoFit:"shrinkText"};
  return s;
}

function rule(slide,x,y,w,color=C.line,width=1){
  slide.shapes.add({geometry:"rect",position:{left:x,top:y,width:w,height:width},fill:color,line:{style:"solid",fill:color,width:0}});
}

function img(slide,path,x,y,w,h,fit="contain",alt=""){
  const bytes=assetBytes.get(path);
  if(!bytes) throw new Error(`Image was not preloaded: ${path}`);
  const ext=path.toLowerCase().split(".").pop();
  const contentType=ext==="png"?"image/png":ext==="webp"?"image/webp":"image/jpeg";
  return slide.images.add({blob:bytes,contentType,alt,fit,position:{left:x,top:y,width:w,height:h}});
}

function base(p,title,kicker,page){
  const s=p.slides.add(); s.background.fill=C.bg;
  txt(s,kicker.toUpperCase(),54,26,600,26,14,C.gold,true);
  txt(s,title,54,56,1160,72,38,C.ink,true);
  rule(s,54,124,1172,C.line,1);
  txt(s,String(page).padStart(2,"0"),1178,675,48,20,12,C.muted,false,"right");
  return s;
}

function notes(slide, body, sources=[]){
  slide.speakerNotes.textFrame.setText(`${body}\n\n[Sources]\n${sources.map(s=>`- ${s}`).join("\n")}`);
  slide.speakerNotes.setVisible(true);
}

function colorDot(slide,x,y,color,label){
  box(slide,x,y,72,72,color,"none","ellipse");
  txt(slide,label,x-10,y+80,92,26,16,C.ink,true,"center");
}

function arrow(slide,x,y,w=52){
  rule(slide,x,y,w,C.gold,2);
  slide.shapes.add({geometry:"chevron",position:{left:x+w-11,top:y-7,width:14,height:15},fill:C.gold,line:{style:"solid",fill:C.gold,width:0}});
}

async function build(){
  const imagePaths=[
    `${A}/van-gogh-sunflowers-public-domain.jpg`,
    `${A}/sunflowers-app-ruten.png`,
    `${A}/sunflowers-app-keiso.png`,
    `${A}/sunflowers-app-zanko.png`,
    `${A}/ferrari-f8-tributo-cc0.jpg`,
    `${A}/ferrari-app-keiso.png`,
  ];
  for(const path of imagePaths) assetBytes.set(path,new Uint8Array(await fs.readFile(path)));
  const p=Presentation.create({slideSize:{width:1280,height:720}});

  // 01 COVER - Codex Grid slide-08 hierarchy: large left message + right hero.
  {
    const s=p.slides.add(); s.background.fill=C.bg;
    txt(s,"艶 II / SOURCE",54,42,520,28,16,C.gold,true);
    txt(s,"写真から\n5本のネイルへ",54,118,540,170,58,C.ink,true,"left",SERIF);
    txt(s,"色・線・光を採集し、\n制御された偶然性で再構成する",58,326,500,88,24,C.muted,false);
    txt(s,"修士制作　制作過程",58,554,300,28,18,C.ink,true);
    txt(s,"今福恵美子",58,590,300,30,20,C.ink,false);
    img(s,`${A}/van-gogh-sunflowers-public-domain.jpg`,658,42,568,486,"cover","ゴッホ《ひまわり》");
    box(s,684,478,516,132,C.black,"none","roundRect");
    img(s,`${A}/sunflowers-app-ruten.png`,708,494,468,84,"contain","ひまわりから生成した流転の5本");
    txt(s,"Vincent van Gogh, Sunflowers, 1888 / Public Domain",658,636,568,24,11,C.muted,false,"right");
    txt(s,"01",1178,675,48,20,12,C.muted,false,"right");
    notes(s,"この発表では、写真をそのまま爪に貼るのではなく、色・線・形・光に分解し、5本のネイルとして再構成する制作過程を説明します。",[
      "Vincent van Gogh, Sunflowers, 1888, Public Domain, Wikimedia Commons",
      `ネイル画像: 艶II SOURCEのCanvas描画出力 / ${APP}`,
    ]);
  }

  // 02 core principle - slide-02 sparse message.
  {
    const s=base(p,"ランダムではなく、3つの要素を掛け合わせる","method / central idea",2);
    const xs=[80,460,840], heads=["写真の特徴","今福の構成判断","制御された乱数"], bodies=["色の量と鮮やかさ\n線・明暗差・光","色を並べる順番\n5本の模様と強弱","線や光の位置に\n自然な揺らぎを作る"];
    const cols=[C.pink,C.gold,C.mint];
    for(let i=0;i<3;i++){
      txt(s,String(i+1).padStart(2,"0"),xs[i],188,100,44,30,cols[i],true);
      txt(s,heads[i],xs[i],244,300,46,25,C.ink,true);
      txt(s,bodies[i],xs[i],306,300,96,20,C.muted,false);
      if(i<2){txt(s,"×",xs[i]+319,282,50,60,42,C.line,false,"center");}
    }
    txt(s,"写真の個性は残す。でも、5本のまとまりは偶然に任せない。",80,500,1090,64,28,C.ink,true,"center",SERIF);
    notes(s,"プログラムはすべてを乱数で決めません。画像から変わる部分、5本の構成として固定する部分、細部だけを揺らす部分を分けています。",[
      `制作説明の正本: ${PASTED}`,
      `実装: ${APP}`,
    ]);
  }

  // 03 workflow - timeline reference.
  {
    const s=base(p,"入力した写真を、4段階でネイルへ変換する","process / overview",3);
    const x0=74, gap=286;
    const steps=[
      ["01","色を8色選ぶ","面積と彩度で\n色の順位を決める"],
      ["02","特徴を0-1にする","線・明暗差・光を\n比較できる数値にする"],
      ["03","色と5本を構成する","色順と模様表に\n数値を入れる"],
      ["04","線・形・光を描く","同じ入力なら\n同じ結果を再現できる"],
    ];
    rule(s,92,302,1072,C.line,3);
    for(let i=0;i<4;i++){
      const x=x0+i*gap;
      box(s,x,280,42,42,i===0?C.pink:C.gold,"none","ellipse");
      txt(s,steps[i][0],x-6,285,54,30,14,C.white,true,"center");
      txt(s,steps[i][1],x,348,246,58,22,C.ink,true);
      txt(s,steps[i][2],x,418,246,86,17,C.muted,false);
    }
    txt(s,"ここでは「生成」を、特徴の採集と再編成として扱う",74,568,1080,42,22,C.ink,true,"center");
    notes(s,"写真を小さくして全体の傾向を読み、色と特徴量を取り出し、5本の構成とCanvas描画に渡します。画像そのものを爪へ貼る処理ではありません。",[`extractSourcePalette(), analyzeSource(), makeSourceSets() / ${APP}`]);
  }

  // 04 color score + actual image.
  {
    const s=base(p,"色は「写っている量」と「鮮やかさ」で選ぶ","color extraction",4);
    img(s,`${A}/van-gogh-sunflowers-public-domain.jpg`,54,164,320,388,"contain","ゴッホ《ひまわり》");
    txt(s,"色の得点",432,174,220,34,22,C.gold,true);
    txt(s,"写真に含まれる量\n×\n（0.28 + 彩度 × 2.8）",432,220,700,150,36,C.ink,true,"center",SERIF);
    rule(s,446,396,674,C.line,2);
    txt(s,"0.28",446,422,180,42,30,C.mint,true);
    txt(s,"白・灰・茶色など\n低彩度色を0にしない",446,470,250,74,18,C.muted,false);
    txt(s,"2.8",780,422,180,42,30,C.pink,true);
    txt(s,"面積が小さくても\n鮮やかな色を拾う",780,470,250,74,18,C.muted,false);
    const pal=["#976919","#674628","#667636","#97974A","#365528","#D8C778","#B4A770","#FDE38A"];
    for(let i=0;i<8;i++)box(s,432+i*92,582,76,34,pal[i],"none","roundRect");
    txt(s,"プログラムが選んだ8色",432,626,720,26,15,C.muted,false);
    txt(s,"Vincent van Gogh, Sunflowers, 1888 / Public Domain",54,628,320,24,11,C.muted,false);
    notes(s,"得点は、多い色だけでなく、少量でも印象の強い色を拾うための設計値です。0.28と0にしないことで低彩度色を残し、2.8で鮮やかな差し色を強調します。",[
      "Vincent van Gogh, Sunflowers, 1888, Public Domain, Wikimedia Commons",
      `色抽出式: extractSourcePalette() / ${APP}`,
    ]);
  }

  // 05 parameters.
  {
    const s=base(p,"数値を変えると、選ばれる色の性格が変わる","parameter study",5);
    const data=[
      ["0.28 を大きく","無彩色・茶色・ベージュが残る","落ち着く / 差し色が弱くなる",C.mint],
      ["2.8 を大きく","少量の赤や青が上位に入る","鮮やか / 元画像の面積比から離れる",C.pink],
      ["RGB距離 48 を大きく","似た色を同時に選びにくくする","色幅が出る / 微妙な色差は減る",C.gold],
    ];
    for(let i=0;i<3;i++){
      const y=176+i*145;
      txt(s,data[i][0],64,y,340,38,24,data[i][3],true);
      txt(s,data[i][1],438,y,700,38,22,C.ink,true);
      txt(s,data[i][2],438,y+52,700,40,18,C.muted,false);
      rule(s,64,y+112,1096,C.line,1);
    }
    box(s,64,606,1096,42,C.ink,"none","rect");
    txt(s,"0.28と2.8は唯一の正解ではなく、AI実装時に置かれた暫定値",82,611,1058,30,18,C.white,true,"center");
    notes(s,"値を大きくすると常に良くなるのではなく、色の性格が変わります。0.28と2.8は今福が直接指定した数値でも、比較実験で最適と証明した数値でもありません。制作方針をコード化する際にAI実装支援が置いた暫定値です。",[`extractSourcePalette() / ${APP}`,`制作起点記録と数値の来歴: ${PASTED}`]);
  }

  // 06 color balance / 1-4-2-5-3.
  {
    const s=base(p,"色の多様性と、5本の並びでバランスを作る","five-finger composition",6);
    txt(s,"似すぎる色は、最初の選考で離す",66,170,520,38,24,C.ink,true);
    colorDot(s,92,236,"#C69B43","色A"); colorDot(s,262,236,"#C9A047","色B");
    txt(s,"RGB距離 ≤ 48",356,246,220,42,24,C.pink,true);
    txt(s,"似た色ばかりを防ぐ\n※これだけで「美しさ」は判定しない",92,350,470,82,18,C.muted,false);
    rule(s,620,168,1,C.line,420);
    txt(s,"抽出順位は、そのまま並べない",680,170,500,38,24,C.ink,true);
    const colors=["#976919","#97974A","#674628","#365528","#667636"];
    const labs=["1位","4位","2位","5位","3位"];
    for(let i=0;i<5;i++){
      const x=690+i*96; colorDot(s,x,248,colors[i],labs[i]); if(i<4)arrow(s,x+76,284,20);
    }
    txt(s,"主色と差し色を交互に置く\nこの色順はプログラムに固定",690,392,470,74,18,C.muted,false);
    txt(s,"バランス = 色の選別 + 並べる順番 + 模様の強弱",112,552,1050,48,30,C.gold,true,"center",SERIF);
    notes(s,"RGB距離48は、似た色ばかりを防ぐフィルターです。その後、1・4・2・5・3位の順に並べることで、上位色が隣り続けるのを避けます。美的バランスは、距離計算一つではなく、後段の模様構成と合わせて作ります。",[`色距離と配列: extractSourcePalette(), makeSourceSets() / ${APP}`]);
  }

  // 07 numeric features with Ferrari image.
  {
    const s=base(p,"写真の線・明暗差・光を0から1の数値にする","feature analysis",7);
    img(s,`${A}/ferrari-f8-tributo-cc0.jpg`,54,164,480,360,"cover","Ferrari F8 Tributo");
    txt(s,"実測値",590,166,240,32,20,C.gold,true);
    const metrics=[["LINE  線密度",.37,C.pink],["LIGHT  光",.04,C.gold],["CONTRAST  明暗差",.49,C.mint],["SATURATION  彩度",1,C.violet]];
    for(let i=0;i<4;i++){
      const y=224+i*88; txt(s,metrics[i][0],590,y,300,26,18,C.ink,true);
      box(s,590,y+38,500,14,"#D7D3CB","none","roundRect"); box(s,590,y+38,Math.max(14,500*metrics[i][1]),14,metrics[i][2],"none","roundRect");
      txt(s,String(Math.round(metrics[i][1]*100)),1110,y+28,70,34,20,C.ink,true,"right");
    }
    txt(s,"数値は「写真が何を表すか」ではなく、\n画面上の視覚的特徴を測っている",590,592,590,54,19,C.muted,false);
    txt(s,"写真: Mathious Ier / CC0 / Wikimedia Commons",54,546,480,22,11,C.muted,false);
    notes(s,"プログラムは「フェラーリ」という意味を理解しているのではなく、画素の明るさの差、鮮やかさ、明るい面積を測っています。",[
      "Photo: Mathious Ier, Ferrari F8 Tributo, CC0, Wikimedia Commons",
      `数値化: analyzeSource() / ${APP}`,
    ]);
  }

  // 08 three recipes with actual app renderings - three-column Grid reference.
  {
    const s=base(p,"同じ写真から、模様の配列が異なる3案を作る","three source sets",8);
    const sets=[
      ["流転",`${A}/sunflowers-app-ruten.png`,"形 → 線 → 形 → 光 → 単色","形と線を主役にする"],
      ["景層",`${A}/sunflowers-app-keiso.png`,"線 → 透け → 形 → 粒子 → 単色","柄と静かな面を混ぜる"],
      ["残光",`${A}/sunflowers-app-zanko.png`,"形 → 細線 → 光 → パール → マット","質感差で光を強調する"],
    ];
    for(let i=0;i<3;i++){
      const x=54+i*404;
      txt(s,`0${i+1}  ${sets[i][0]}`,x,170,360,34,24,i===0?C.pink:C.gold,true);
      box(s,x,224,364,196,C.black,"none","rect"); img(s,sets[i][1],x+18,252,328,128,"contain",`${sets[i][0]}の5本`);
      txt(s,sets[i][2],x,450,364,42,18,C.ink,true,"center");
      txt(s,sets[i][3],x,504,364,54,18,C.muted,false,"center");
    }
    txt(s,"「主役」や「余白」はコード上の名称ではなく、模様配列のデザイン上の解釈",100,610,1080,38,18,C.muted,false,"center");
    notes(s,"画像分析が決めるのは色と模様量です。どの指に形、線、光、単色を置くかは、予めプログラムに指定した構成表です。",[`sourceRecipes('MIX'), makeSourceSets() / ${APP}`,"各ネイル画像: 艶II SOURCEのCanvas描画出力"]);
  }

  // 09 seeded variation, explained as an ordered process rather than an analogy.
  {
    const s=base(p,"同じ画像から、同じ3案を出せるようにする","seeded variation",9);
    const steps=[
      ["01","画像の色を順番に読む","各画素の色と透明度を、小さな数へまとめる"],
      ["02","画像ごとの番号を作る","画像全体から、一つの整数を計算する"],
      ["03","番号から小さな変化を作る","0から1までの数を、決まった順番で取り出す"],
      ["04","決めた範囲の中だけを変える","低彩度色と鮮やかな色の強め方を少し動かす"],
    ];
    for(let i=0;i<4;i++){
      const y=170+i*102;
      txt(s,steps[i][0],72,y,66,38,26,i===0?C.pink:C.gold,true);
      txt(s,steps[i][1],154,y,390,38,23,C.ink,true);
      txt(s,steps[i][2],566,y,620,44,18,C.muted,false);
      if(i<3)rule(s,72,y+72,1114,C.line,1);
    }
    box(s,72,588,1114,54,C.black,"none","rect");
    txt(s,"同じ画像 → 同じ番号 → 同じ変化　／　別の画像 → 別の番号 → 少し違う変化",96,598,1066,34,20,C.white,true,"center");
    notes(s,"ここでいうシードは、画像から計算する一つの整数です。その整数から0から1までの数を順番に作ります。同じ画像なら整数も数の順番も同じになるため、ページを開き直しても同じ3案を再現できます。",[`sourceSeedFromPixels(), sourcePaletteTunings() / ${APP}`]);
  }

  // 10 what changes and what stays fixed.
  {
    const s=base(p,"変える範囲を先に決め、色選びだけを少し動かす","variation limits",10);
    const rows=[
      ["流転","0.25〜0.31","2.75〜3.15","形と線を強く見せる",C.pink],
      ["景層","0.30〜0.36","2.20〜2.65","低彩度色も残して層を作る",C.mint],
      ["残光","0.22〜0.28","3.05〜3.45","小さな鮮やかな色を拾う",C.gold],
    ];
    txt(s,"案",72,168,140,30,18,C.muted,true);
    txt(s,"低彩度色を残す量",220,168,250,30,18,C.muted,true);
    txt(s,"鮮やかな色を強める量",492,168,300,30,18,C.muted,true);
    txt(s,"役割",822,168,340,30,18,C.muted,true);
    for(let i=0;i<3;i++){
      const y=220+i*102;
      txt(s,rows[i][0],72,y,130,38,26,rows[i][4],true);
      txt(s,rows[i][1],220,y,220,38,24,C.ink,true);
      txt(s,rows[i][2],492,y,260,38,24,C.ink,true);
      txt(s,rows[i][3],822,y,350,44,19,C.ink,false);
      rule(s,72,y+68,1098,C.line,1);
    }
    txt(s,"変えないもの",72,550,190,34,23,C.gold,true);
    txt(s,"5本の模様の順番　／　爪の形と長さ　／　線・形・光の描き方　／　手の追跡",276,548,894,42,19,C.ink,true);
    txt(s,"数値は自由に動かさず、案ごとの上限と下限の中だけで変える",72,612,1098,34,22,C.ink,true,"center",SERIF);
    notes(s,"今回の試作では、色の得点式にある二つの数値だけを画像ごとに変えます。流転、景層、残光には別々の範囲を設定し、5本の構成や手の追跡は変えません。",[`sourcePaletteTunings(), makeSourceSets() / ${APP}`]);
  }

  // 11 balance rules - 4 point grid.
  {
    const s=base(p,"バランスは、4つの制限を重ねて作る","balancing rules",11);
    const items=[
      ["01","色の重複を減らす","似すぎる色の同時採用を抑える"],
      ["02","色順をずらす","上位色を連続させず 1・4・2・5・3 で並べる"],
      ["03","模様の強弱を混ぜる","形・線・光の間に透け・単色・マットを置く"],
      ["04","数値の上限と下限","弱すぎるときも描き、多すぎるときは1で止める"],
    ];
    for(let i=0;i<4;i++){
      const x=64+(i%2)*586,y=176+Math.floor(i/2)*208;
      txt(s,items[i][0],x,y,70,38,26,i===0?C.pink:C.gold,true);
      txt(s,items[i][1],x+80,y,450,38,23,C.ink,true);
      txt(s,items[i][2],x+80,y+58,450,74,18,C.muted,false);
      rule(s,x,y+154,512,C.line,1);
    }
    box(s,64,606,1098,40,C.black,"none","rect");
    txt(s,"プログラムは「美しい」を理解せず、まとまりやすい条件を実行する",78,610,1070,28,17,C.white,true,"center");
    notes(s,"一つの計算で美的バランスを出しているわけではありません。色の選別、並べ順、模様構成、強さの制限を順番に適用しています。",[`extractSourcePalette(), sourceRecipes(), makeSourceSets() / ${APP}`]);
  }

  // 12 author evaluation.
  {
    const s=base(p,"最後の「良さ」は、ネイリストと制作者の目で判断する","author evaluation",12);
    img(s,`${A}/ferrari-app-keiso.png`,62,178,540,184,"contain","フェラーリから生成した景層");
    txt(s,"プログラムができること",64,404,470,34,24,C.gold,true);
    txt(s,"複数案を生成する\n同じ条件を再現する\n色・線・光の量を調整する",64,452,500,112,20,C.ink,false);
    rule(s,638,166,1,C.line,438);
    txt(s,"今福が見て決めること",696,178,460,34,24,C.pink,true);
    const criteria=[["統一感","5本が一つのセットに見える"],["変化","5本すべてが同じではない"],["強弱","柄と静かな面の両方がある"],["装着性","実際の手とスマホ画面で読み取れる"],["翻訳性","元画像の特徴がコピーでなく残る"],["作品性","通常のネイルと作品の間にある"]];
    for(let i=0;i<6;i++){
      const y=238+i*58; txt(s,criteria[i][0],696,y,110,30,18,i<2?C.pink:C.gold,true); txt(s,criteria[i][1],818,y,360,40,17,C.ink,false);
    }
    txt(s,"良くない出力は採用せず、構成や見え方の修正を指示した",64,612,1098,32,20,C.ink,true,"center",SERIF);
    notes(s,"「ネイルとして良い」は自動的な点数ではありません。5本の統一感、強弱、実際の手に載せたときの見え方、元画像との関係を今福が比較し、採用・却下・修正を決めました。",[`制作対話と判断基準: ${PASTED}`,"ネイル画像: 艶II SOURCEのCanvas描画出力"]);
  }

  // 13 authorship and close.
  {
    const s=base(p,"作者性は「全部を手作業したか」ではなく、判断と責任にある","authorship / conclusion",13);
    txt(s,"今福恵美子",78,176,500,42,30,C.pink,true);
    txt(s,"• 写真からネイルを作る発想\n• 色・線・光へ分解する方針\n• 5本を同じ柄にしない方針\n• 出力の比較、採用、却下、修正\n• 作品全体の体験と美的方向",78,238,500,210,21,C.ink,false);
    txt(s,"生成AIによる実装支援",704,176,480,42,30,C.gold,true);
    txt(s,"• 色抽出式のコード化\n• 特徴量の数値化\n• Canvasによる線・形・光の描画\n• バグ修正とスマートフォン向け実装\n• 説明と記録の整理",704,238,480,210,21,C.ink,false);
    rule(s,630,168,1,C.line,312);
    box(s,80,514,1104,112,C.black,"none","rect");
    txt(s,"写真から特徴を採集し、\n制作者の判断で「装着できる作品」へ編集する",118,530,1028,76,30,C.white,true,"center",SERIF);
    notes(s,"作品の発想、方針、美的判断、最終責任は今福恵美子が担います。数式の具体化やコードの実装には生成AIの支援を利用しています。発表では、この分担を明示します。",[
      "今福恵美子の制作対話・採否判断",
      "実装支援: OpenAI Codex / ChatGPT",
      "京都芸術大学通信教育課程の生成AI利用ガイドラインに基づき、利用範囲と本人の確認を記録",
    ]);
  }

  await fs.mkdir(PREVIEW,{recursive:true});
  for(const [i,s] of p.slides.items.entries()){
    const png=await p.export({slide:s,format:"png",scale:1});
    await fs.writeFile(`${PREVIEW}/slide-${String(i+1).padStart(2,"0")}.png`,new Uint8Array(await png.arrayBuffer()));
    const layout=await s.export({format:"layout"});
    await fs.writeFile(`${PREVIEW}/slide-${String(i+1).padStart(2,"0")}.layout.json`,await layout.text());
  }
  const montage=await p.export({format:"webp",montage:true,scale:1});
  await fs.writeFile(`${PREVIEW}/montage.webp`,new Uint8Array(await montage.arrayBuffer()));
  const pptx=await PresentationFile.exportPptx(p);
  await pptx.save(OUT);
  console.log(OUT);
}

build().catch(e=>{console.error(e);process.exitCode=1;});
