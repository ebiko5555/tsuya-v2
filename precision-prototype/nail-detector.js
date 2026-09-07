/**
 * NailDetector & Precision Fitting Engine
 * 自爪輪郭・キューティクルライン精密フィッティングエンジン
 * 
 * 1. 骨格ランドマークからの幾何学的自爪アンカー推定
 * 2. ネイリスト仕様のベジェ輪郭生成（キューティクル・サイドウォール・Cカーブ）
 * 3. ONNX Runtime Web / 爪セグメンテーションモデル連携インターフェース
 */
(function(root){
  'use strict';

  // 指の関節構成 [TIP, DIP, PIP, MCP]
  const FINGER_JOINTS = [
    { name: '親指',  indices: [4, 3, 2, 1],   defaultRatio: 0.23, widthRatio: 0.58 },
    { name: '人差し指',  indices: [8, 7, 6, 5],   defaultRatio: 0.17, widthRatio: 0.52 },
    { name: '中指', indices: [12, 11, 10, 9], defaultRatio: 0.19, widthRatio: 0.54 },
    { name: '薬指',   indices: [16, 15, 14, 13],defaultRatio: 0.17, widthRatio: 0.51 },
    { name: '小指',  indices: [20, 19, 18, 17],defaultRatio: 0.14, widthRatio: 0.46 }
  ];

  class PrecisionNailEngine {
    constructor(){
      this.onnxSession = null;
      this.modelLoaded = false;
      // 指ごとの微調整オフセット（ネイリストの手技によるキャリブレーション値）
      this.calibration = {
        cuticleOffset: 0.08,  // 甘皮ラインへの押し込み深さ比率
        widthScale: 1.0,      // 爪幅（サイドウォール密着率）
        lengthScale: 1.0,     // 長さ比率
        curveArch: 0.22,      // Cカーブの深さ
        perFinger: [
          { shiftX: 0, shiftY: 0, scaleW: 1.0, scaleL: 1.0, cuticleDepth: 1.0 }, // 親指
          { shiftX: 0, shiftY: 0, scaleW: 1.0, scaleL: 1.0, cuticleDepth: 1.0 }, // 人差し指
          { shiftX: 0, shiftY: 0, scaleW: 1.0, scaleL: 1.0, cuticleDepth: 1.0 }, // 中指
          { shiftX: 0, shiftY: 0, scaleW: 1.0, scaleL: 1.0, cuticleDepth: 1.0 }, // 薬指
          { shiftX: 0, shiftY: 0, scaleW: 1.0, scaleL: 1.0, cuticleDepth: 1.0 }  // 小指
        ]
      };
    }

    /**
     * 将来的な ONNX 爪セグメンテーションモデル（YOLOv8-seg / U-Net）の読み込み
     */
    async loadOnnxModel(modelUrlOrBuffer){
      if(typeof ort === 'undefined'){
        console.warn('ONNX Runtime Web is not loaded.');
        return false;
      }
      try {
        this.onnxSession = await ort.InferenceSession.create(modelUrlOrBuffer, {
          executionProviders: ['webgpu', 'wasm']
        });
        this.modelLoaded = true;
        console.log('Precision Nail ONNX Model loaded successfully.');
        return true;
      } catch(err) {
        console.warn('Failed to load ONNX model, falling back to skeletal contour fitting:', err);
        return false;
      }
    }

    /**
     * MediaPipe の手のランドマークと画像から、自爪の精密なフィッティング輪郭を算出
     */
    fitNailsFromLandmarks(landmarks, imgWidth, imgHeight){
      if(!landmarks || !landmarks.length) return [];

      // 手のひらの代表骨格長（スケール基準）
      const p0 = landmarks[0], p5 = landmarks[5], p17 = landmarks[17];
      const palmScale = Math.hypot((p5.x - p0.x)*imgWidth, (p5.y - p0.y)*imgHeight);

      return FINGER_JOINTS.map((finger, fi) => {
        const [tipIdx, dipIdx, pipIdx, mcpIdx] = finger.indices;
        const tip = landmarks[tipIdx];
        const dip = landmarks[dipIdx];
        const pip = landmarks[pipIdx];

        const tx = tip.x * imgWidth, ty = tip.y * imgHeight;
        const dx = dip.x * imgWidth, dy = dip.y * imgHeight;
        const px = pip.x * imgWidth, py = pip.y * imgHeight;

        // 骨格ベクトルによる方向の算出（指の主軸と先端の合成）
        const vTipX = tx - dx, vTipY = ty - dy;
        const vMidX = dx - px, vMidY = dy - py;
        const ang = Math.atan2(vTipY * 0.40 + vMidY * 0.60, vTipX * 0.40 + vMidX * 0.60);

        // 指節長
        const rawDist = Math.hypot(vTipX, vTipY);
        const refDist = palmScale * finger.defaultRatio;
        const jointLen = Math.max(rawDist, refDist * 0.95);

        // キャリブレーション値の適用
        const cal = this.calibration;
        const fCal = cal.perFinger[fi];

        const w = jointLen * finger.widthRatio * cal.widthScale * fCal.scaleW;
        const h = jointLen * 0.96 * cal.lengthScale * fCal.scaleL;

        // 自爪のキューティクル（甘皮）位置のアンカー
        // DIP関節から、自爪が生える根元（ネイルベッド基部）を割り出す
        const pushRatio = cal.cuticleOffset * fCal.cuticleDepth;
        const rootX = dx + Math.cos(ang) * (jointLen * 0.45) + fCal.shiftX;
        const rootY = dy + Math.sin(ang) * (jointLen * 0.45) + fCal.shiftY;

        // 爪の中心（ハイポイント位置）
        const centerX = dx + Math.cos(ang) * (jointLen * (0.45 + pushRatio + 0.40));
        const centerY = dy + Math.sin(ang) * (jointLen * (0.45 + pushRatio + 0.40));

        return {
          fingerIndex: fi,
          name: finger.name,
          root: { x: rootX, y: rootY },
          center: { x: centerX, y: centerY },
          tip: { x: tx, y: ty },
          dip: { x: dx, y: dy },
          angle: ang,
          width: w,
          height: h,
          arch: cal.curveArch
        };
      });
    }

    /**
     * プロのネイリスト仕様：自然な自爪・キューティクル輪郭のベジェパスを描画
     */
    drawCuticleContour(ctx, nail){
      const { width: w, height: h } = nail;
      const baseY = h * 0.40;

      ctx.beginPath();
      // キューティクルライン（甘皮側の優美なU字カーブ）
      ctx.moveTo(-w * 0.48, baseY);
      ctx.bezierCurveTo(-w * 0.48, h * 0.52, -w * 0.28, h * 0.56, 0, h * 0.56);
      ctx.bezierCurveTo(w * 0.28, h * 0.56, w * 0.48, h * 0.52, w * 0.48, baseY);

      // サイドウォール（両脇のストレートな立ち上がり）
      ctx.bezierCurveTo(w * 0.49, h * 0.05, w * 0.46, -h * 0.24, w * 0.38, -h * 0.42);

      // フリーエッジ（先端の滑らかなオーバルアーモンド・ラウンド）
      ctx.bezierCurveTo(w * 0.22, -h * 0.56, -w * 0.22, -h * 0.56, -w * 0.38, -h * 0.42);

      // 反対側サイドウォールからキューティクルへ
      ctx.bezierCurveTo(-w * 0.46, -h * 0.24, -w * 0.49, h * 0.05, -w * 0.48, baseY);
      ctx.closePath();
    }

    /**
     * キューティクル・スキンブレンド（甘皮のキワに皮膚の影と半透明馴染みを施し、自爪から生えている質感を出す）
     */
    applyCuticleSkinBlend(ctx, nail){
      const { width: w, height: h } = nail;
      ctx.save();
      // 甘皮ラインの内側に落ちる微細なインナーシャドウ
      const shadowGrad = ctx.createRadialGradient(0, h * 0.46, w * 0.20, 0, h * 0.46, w * 0.58);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shadowGrad.addColorStop(0.70, 'rgba(40,15,10,0.18)');
      shadowGrad.addColorStop(1, 'rgba(30,10,8,0.45)');

      ctx.fillStyle = shadowGrad;
      ctx.fillRect(-w * 0.6, h * 0.20, w * 1.2, h * 0.45);
      ctx.restore();
    }
  }

  root.PrecisionNailEngine = PrecisionNailEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
