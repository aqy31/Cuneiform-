import * as THREE from 'three';

/**
 * منشئ مجسم اللوح الطيني المسماري والمواد الإجرائية فائقة الدقة
 */
export class TabletBuilder {
  constructor() {
    this.currentTextData = null;
    this.currentClayConfig = null;
    this.textures = {};
    this.tabletMesh = null;
    this.activeLineIndices = [];
    this.lineHotspots = [];
  }

  /**
   * إنشاء وتشكيل اللوح الطيني مع خامات التجاويف والمسامير
   */
  createTablet(textData, clayConfig) {
    this.currentTextData = textData;
    this.currentClayConfig = clayConfig;

    // أبعاد اللوح الأثري التقليدي (Pillow Tablet)
    const width = 3.6;
    const height = 5.2;
    const depth = 0.85;

    // هندسة شبكية ثلاثية الأبعاد منحنية تحاكي انتفاخ اللوح في المنتصف وتآكل الأطراف
    const geometry = this.buildPillowTabletGeometry(width, height, depth, 48, 48, 16);

    // توليد خرائط المسامير والأخاديد والنورمال والخشونة بسرعة فائقة
    this.generateCuneiformTextures(textData, clayConfig);

    // خامة PBR واقعية مع خرائط الشيدر
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(clayConfig.color),
      roughness: clayConfig.roughness,
      metalness: clayConfig.metalness,
      map: this.textures.diffuse,
      normalMap: this.textures.normal,
      normalScale: new THREE.Vector2(clayConfig.reliefScale, clayConfig.reliefScale),
      roughnessMap: this.textures.roughness,
      aoMap: this.textures.ao,
      aoMapIntensity: 1.3,
      displacementMap: this.textures.displacement,
      displacementScale: 0.035,
      displacementBias: -0.012,
      side: THREE.FrontSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "cuneiformTablet";
    this.tabletMesh = mesh;

    // إعداد نقاط التركيز لسطور النص (Hotspots) لتوجيه الكاميرا
    this.computeLineHotspots(height, textData.lines ? textData.lines.length : 6);

    return mesh;
  }

  /**
   * بناء هندسة اللوح المنتفخ مع نعومة الأطراف وتأثير الضغط اليدوي للكاتب
   */
  buildPillowTabletGeometry(w, h, d, segW, segH, segD) {
    const geom = new THREE.BoxGeometry(w, h, d, segW, segH, segD);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();

    // تشويه رؤوس المجسم لإعطائه هيئة الطين المشكل باليد (Pillow Shape)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // المسافة النسبية عن مركز اللوح
      const nx = v.x / (w * 0.5);
      const ny = v.y / (h * 0.5);
      const nz = v.z / (d * 0.5);

      // انتفاخ الوجه والقفا وتناقص السماكة عند الحواف
      const edgeFactor = (1.0 - Math.pow(nx, 4)) * (1.0 - Math.pow(ny, 4));

      // ترقيق الحواف
      if (Math.abs(nz) > 0.8) {
        v.z *= (0.65 + 0.35 * Math.max(0, edgeFactor));
      }

      // تقويس طفيف للزوايا والحواف الجانبية
      v.x *= (1.0 - 0.08 * Math.pow(ny, 2));
      v.y *= (1.0 - 0.04 * Math.pow(nx, 2));

      // تموجات طينية عضوية تحاكي ضغط أصابع الكاتب القديم (Finger impressions)
      const fingerWave = Math.sin(v.y * 3.5 + v.x * 2.0) * 0.018 * Math.cos(v.z * 4.0);
      const microNoise = (Math.sin(v.x * 35.0) * Math.cos(v.y * 35.0)) * 0.004;

      v.z += (v.z > 0 ? 1 : -1) * (fingerWave + microNoise);

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geom.computeVertexNormals();
    return geom;
  }

  /**
   * توليد خرائط التجاويف والنورمال المسمارية الأثرية بدقة 1024x1024 لتشغيل فوري وسلس
   */
  generateCuneiformTextures(textData, clayConfig) {
    const size = 1024;
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hctx = heightCanvas.getContext('2d');

    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dctx = diffuseCanvas.getContext('2d');

    // 1. رسم خلفية الطين الطبيعية مع التباين اللوني
    this.renderClayBase(hctx, dctx, size, clayConfig);

    // 2. حفر خطوط التسطير والمسامير (الوجه الأول - Obverse)
    const lines = (textData && textData.lines) ? textData.lines : [];
    this.renderCuneiformInscriptions(hctx, dctx, size, lines, true);

    // 3. حفر قفا اللوح (Reverse)
    this.renderCuneiformInscriptions(hctx, dctx, size, lines, false);

    // 4. استخراج خريطة النورمال (Normal Map) وخريطة التجاويف (Cavity/AO)
    const normalCanvas = this.generateNormalMapFromHeight(heightCanvas, size, 2.5);
    const aoCanvas = this.generateAOMapFromHeight(heightCanvas, size);
    const roughnessCanvas = this.generateRoughnessMap(heightCanvas, size, clayConfig.roughness);

    // إنشاء أنسجة Three.js
    this.textures.diffuse = new THREE.CanvasTexture(diffuseCanvas);
    this.textures.diffuse.wrapS = THREE.RepeatWrapping;
    this.textures.diffuse.wrapT = THREE.RepeatWrapping;

    this.textures.normal = new THREE.CanvasTexture(normalCanvas);
    this.textures.normal.wrapS = THREE.RepeatWrapping;
    this.textures.normal.wrapT = THREE.RepeatWrapping;

    this.textures.ao = new THREE.CanvasTexture(aoCanvas);
    this.textures.ao.wrapS = THREE.RepeatWrapping;
    this.textures.ao.wrapT = THREE.RepeatWrapping;

    this.textures.roughness = new THREE.CanvasTexture(roughnessCanvas);
    this.textures.displacement = new THREE.CanvasTexture(heightCanvas);
  }

  renderClayBase(hctx, dctx, size, clayConfig) {
    // رمادي محايد لارتفاع السطح (128)
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, size, size);

    // لون الطين الأساسي
    dctx.fillStyle = clayConfig.color || '#b87042';
    dctx.fillRect(0, 0, size, size);

    // تدرجات لونية تحاكي احتراق الفخار
    const numSpots = 25;
    for (let i = 0; i < numSpots; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 40 + Math.random() * 150;
      const grad = dctx.createRadialGradient(x, y, 5, x, y, r);
      grad.addColorStop(0, clayConfig.specularTint || '#e0a96d');
      grad.addColorStop(0.7, 'rgba(0,0,0,0)');
      dctx.fillStyle = grad;
      dctx.globalAlpha = 0.15;
      dctx.beginPath();
      dctx.arc(x, y, r, 0, Math.PI * 2);
      dctx.fill();
    }

    // بقع الطمي الداكن
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 30 + Math.random() * 90;
      const grad = dctx.createRadialGradient(x, y, 3, x, y, r);
      grad.addColorStop(0, clayConfig.ambient || '#1f1008');
      grad.addColorStop(0.8, 'rgba(0,0,0,0)');
      dctx.fillStyle = grad;
      dctx.globalAlpha = 0.22;
      dctx.beginPath();
      dctx.arc(x, y, r, 0, Math.PI * 2);
      dctx.fill();
    }
    dctx.globalAlpha = 1.0;

    // مسام وحبيبات الرمل
    const imgDataH = hctx.getImageData(0, 0, size, size);
    const dataH = imgDataH.data;
    for (let i = 0; i < dataH.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      dataH[i] = Math.max(0, Math.min(255, dataH[i] + noise));
      dataH[i+1] = dataH[i];
      dataH[i+2] = dataH[i];
    }
    hctx.putImageData(imgDataH, 0, 0);
  }

  renderCuneiformInscriptions(hctx, dctx, size, lines, isObverse) {
    const sideMarginX = size * 0.08;
    const availableWidth = size * 0.84;
    const startY = isObverse ? size * 0.07 : size * 0.55;
    const sectionHeight = size * 0.40;
    const totalLines = Math.max(lines.length, 6);
    const lineSpacing = sectionHeight / totalLines;

    lines.forEach((lineData, idx) => {
      const y = startY + idx * lineSpacing;

      // خط التسطير الأفقي
      this.drawRegisterLine(hctx, dctx, sideMarginX, y - 4, availableWidth);

      // رسم مقاطع المسامير
      const cuneiformChars = (lineData.cuneiform || '').split(/\s+/).filter(Boolean);
      let curX = sideMarginX + 16;

      cuneiformChars.forEach((glyph) => {
        const glyphWidth = this.drawCuneiformGlyph(hctx, dctx, curX, y + 10, glyph);
        curX += glyphWidth + 16;
        if (curX > sideMarginX + availableWidth - 25) curX = sideMarginX + 20;
      });

      // خط إغلاق السطر السفلي
      this.drawRegisterLine(hctx, dctx, sideMarginX, y + lineSpacing - 8, availableWidth);
    });

    if (!isObverse) {
      this.drawScribeSeal(hctx, dctx, size * 0.5, startY + sectionHeight + 20);
    }
  }

  drawRegisterLine(hctx, dctx, x, y, width) {
    hctx.save();
    hctx.strokeStyle = '#484848';
    hctx.lineWidth = 2.5;
    hctx.beginPath();
    hctx.moveTo(x, y);
    for (let step = x; step < x + width; step += 40) {
      hctx.lineTo(step, y + (Math.random() - 0.5) * 1.5);
    }
    hctx.stroke();
    hctx.restore();

    dctx.save();
    dctx.strokeStyle = 'rgba(25, 15, 8, 0.45)';
    dctx.lineWidth = 2;
    dctx.beginPath();
    dctx.moveTo(x, y);
    dctx.lineTo(x + width, y);
    dctx.stroke();
    dctx.restore();
  }

  drawCuneiformGlyph(hctx, dctx, x, y, glyph) {
    const charCode = glyph.charCodeAt(0) || 0;
    const wedgeCount = 3 + (charCode % 4);
    const spacing = 11;
    let width = 0;

    for (let i = 0; i < wedgeCount; i++) {
      const type = (charCode + i) % 4;
      const wx = x + i * spacing;
      const wy = y + ((i % 2 === 0) ? -2 : 4);

      switch (type) {
        case 0:
          this.drawHorizontalWedge(hctx, dctx, wx, wy, 16, 7);
          width += 16;
          break;
        case 1:
          this.drawVerticalWedge(hctx, dctx, wx, wy, 7, 18);
          width += 10;
          break;
        case 2:
          this.drawWinkelhaken(hctx, dctx, wx, wy, 11);
          width += 12;
          break;
        case 3:
          this.drawDiagonalWedge(hctx, dctx, wx, wy, 14, 11);
          width += 14;
          break;
      }
    }

    return Math.max(width, 30);
  }

  drawHorizontalWedge(hctx, dctx, x, y, length, headWidth) {
    hctx.save();
    const grad = hctx.createLinearGradient(x, y, x + length, y);
    grad.addColorStop(0, '#101010');
    grad.addColorStop(0.3, '#353535');
    grad.addColorStop(1, '#808080');

    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.moveTo(x, y);
    hctx.lineTo(x + headWidth * 0.8, y - headWidth * 0.5);
    hctx.lineTo(x + length, y);
    hctx.lineTo(x + headWidth * 0.8, y + headWidth * 0.5);
    hctx.closePath();
    hctx.fill();
    hctx.restore();

    dctx.save();
    dctx.fillStyle = 'rgba(20, 10, 5, 0.72)';
    dctx.beginPath();
    dctx.moveTo(x, y);
    dctx.lineTo(x + headWidth * 0.8, y - headWidth * 0.5);
    dctx.lineTo(x + length * 0.8, y);
    dctx.lineTo(x + headWidth * 0.8, y + headWidth * 0.5);
    dctx.closePath();
    dctx.fill();
    dctx.restore();
  }

  drawVerticalWedge(hctx, dctx, x, y, headWidth, length) {
    hctx.save();
    const grad = hctx.createLinearGradient(x, y, x, y + length);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(0.35, '#303030');
    grad.addColorStop(1, '#808080');

    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.moveTo(x, y);
    hctx.lineTo(x - headWidth * 0.5, y + headWidth * 0.7);
    hctx.lineTo(x, y + length);
    hctx.lineTo(x + headWidth * 0.5, y + headWidth * 0.7);
    hctx.closePath();
    hctx.fill();
    hctx.restore();

    dctx.save();
    dctx.fillStyle = 'rgba(20, 10, 5, 0.75)';
    dctx.beginPath();
    dctx.moveTo(x, y);
    dctx.lineTo(x - headWidth * 0.5, y + headWidth * 0.7);
    dctx.lineTo(x, y + length * 0.8);
    dctx.lineTo(x + headWidth * 0.5, y + headWidth * 0.7);
    dctx.closePath();
    dctx.fill();
    dctx.restore();
  }

  drawWinkelhaken(hctx, dctx, x, y, size) {
    hctx.save();
    const grad = hctx.createRadialGradient(x, y, 1, x, y, size);
    grad.addColorStop(0, '#080808');
    grad.addColorStop(0.5, '#404040');
    grad.addColorStop(1, '#808080');

    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.moveTo(x, y);
    hctx.lineTo(x + size * 0.8, y - size * 0.35);
    hctx.lineTo(x + size * 0.35, y + size * 0.8);
    hctx.closePath();
    hctx.fill();
    hctx.restore();

    dctx.save();
    dctx.fillStyle = 'rgba(18, 8, 4, 0.78)';
    dctx.beginPath();
    dctx.moveTo(x, y);
    dctx.lineTo(x + size * 0.7, y - size * 0.28);
    dctx.lineTo(x + size * 0.28, y + size * 0.7);
    dctx.closePath();
    dctx.fill();
    dctx.restore();
  }

  drawDiagonalWedge(hctx, dctx, x, y, lenX, lenY) {
    hctx.save();
    const grad = hctx.createLinearGradient(x, y, x + lenX, y + lenY);
    grad.addColorStop(0, '#121212');
    grad.addColorStop(0.4, '#383838');
    grad.addColorStop(1, '#808080');

    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.moveTo(x, y);
    hctx.lineTo(x + 5, y - 4);
    hctx.lineTo(x + lenX, y + lenY);
    hctx.lineTo(x - 4, y + 5);
    hctx.closePath();
    hctx.fill();
    hctx.restore();

    dctx.save();
    dctx.fillStyle = 'rgba(22, 11, 5, 0.7)';
    dctx.beginPath();
    dctx.moveTo(x, y);
    dctx.lineTo(x + 4, y - 3);
    dctx.lineTo(x + lenX * 0.8, y + lenY * 0.8);
    dctx.lineTo(x - 3, y + 4);
    dctx.closePath();
    dctx.fill();
    dctx.restore();
  }

  drawScribeSeal(hctx, dctx, cx, cy) {
    const rw = 160;
    const rh = 45;
    const x = cx - rw / 2;
    const y = cy - rh / 2;

    hctx.save();
    hctx.strokeStyle = '#3a3a3a';
    hctx.lineWidth = 4;
    hctx.strokeRect(x, y, rw, rh);
    hctx.restore();

    dctx.save();
    dctx.fillStyle = 'rgba(15, 8, 3, 0.4)';
    dctx.fillRect(x, y, rw, rh);
    dctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    dctx.lineWidth = 2;
    dctx.strokeRect(x, y, rw, rh);

    dctx.fillStyle = 'rgba(230, 200, 120, 0.7)';
    dctx.font = 'bold 15px serif';
    dctx.textAlign = 'center';
    dctx.fillText('𒁾 𒊬 𒂗 𒆤 𒁀 𒉌', cx, cy + 5);
    dctx.restore();
  }

  generateNormalMapFromHeight(heightCanvas, size, strength = 2.5) {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const nctx = normalCanvas.getContext('2d');
    const hctx = heightCanvas.getContext('2d');

    const hData = hctx.getImageData(0, 0, size, size).data;
    const nImg = nctx.createImageData(size, size);
    const nData = nImg.data;

    for (let y = 0; y < size; y++) {
      const yPrev = (y === 0 ? size - 1 : y - 1) * size;
      const yCurr = y * size;
      const yNext = (y === size - 1 ? 0 : y + 1) * size;

      for (let x = 0; x < size; x++) {
        const xPrev = x === 0 ? size - 1 : x - 1;
        const xNext = x === size - 1 ? 0 : x + 1;

        const tl = hData[(yPrev + xPrev) * 4] / 255.0;
        const t  = hData[(yPrev + x) * 4] / 255.0;
        const tr = hData[(yPrev + xNext) * 4] / 255.0;
        const l  = hData[(yCurr + xPrev) * 4] / 255.0;
        const r  = hData[(yCurr + xNext) * 4] / 255.0;
        const bl = hData[(yNext + xPrev) * 4] / 255.0;
        const b  = hData[(yNext + x) * 4] / 255.0;
        const br = hData[(yNext + xNext) * 4] / 255.0;

        const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
        const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

        let nx = -dx * strength;
        let ny = -dy * strength;
        let nz = 1.0;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = (yCurr + x) * 4;
        nData[idx]     = Math.floor((nx * 0.5 + 0.5) * 255);
        nData[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        nData[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        nData[idx + 3] = 255;
      }
    }

    nctx.putImageData(nImg, 0, 0);
    return normalCanvas;
  }

  generateAOMapFromHeight(heightCanvas, size) {
    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = size;
    aoCanvas.height = size;
    const actx = aoCanvas.getContext('2d');
    const hData = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data;
    const aoImg = actx.createImageData(size, size);
    const aoData = aoImg.data;

    for (let i = 0; i < hData.length; i += 4) {
      const val = hData[i];
      let ao = 255;
      if (val < 128) {
        ao = Math.floor((val / 128) * 210 + 45);
      }
      aoData[i] = ao;
      aoData[i+1] = ao;
      aoData[i+2] = ao;
      aoData[i+3] = 255;
    }

    actx.putImageData(aoImg, 0, 0);
    return aoCanvas;
  }

  generateRoughnessMap(heightCanvas, size, baseRoughness) {
    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rctx = rCanvas.getContext('2d');
    const hData = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data;
    const rImg = rctx.createImageData(size, size);
    const rData = rImg.data;

    const baseVal = Math.floor(baseRoughness * 255);

    for (let i = 0; i < hData.length; i += 4) {
      const h = hData[i];
      const rVal = h < 120 ? Math.min(255, baseVal + 35) : baseVal;
      rData[i] = rVal;
      rData[i+1] = rVal;
      rData[i+2] = rVal;
      rData[i+3] = 255;
    }

    rctx.putImageData(rImg, 0, 0);
    return rCanvas;
  }

  computeLineHotspots(tabletHeight, lineCount) {
    this.lineHotspots = [];
    const topY = tabletHeight * 0.38;
    const stepY = (tabletHeight * 0.76) / Math.max(lineCount, 1);

    for (let i = 0; i < lineCount; i++) {
      this.lineHotspots.push({
        lineIndex: i,
        position: new THREE.Vector3(0, topY - i * stepY, 0.45)
      });
    }
  }

  updateClayMaterial(clayConfig) {
    if (!this.tabletMesh) return;
    this.currentClayConfig = clayConfig;
    const mat = this.tabletMesh.material;
    mat.color.set(clayConfig.color);
    mat.roughness = clayConfig.roughness;
    mat.metalness = clayConfig.metalness;
    mat.normalScale.set(clayConfig.reliefScale, clayConfig.reliefScale);
    mat.needsUpdate = true;
  }

  setReliefScale(scale) {
    if (!this.tabletMesh) return;
    this.tabletMesh.material.normalScale.set(scale, scale);
  }
}
