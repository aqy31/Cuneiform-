import * as THREE from 'three';

/**
 * نظام الرسم والشف المباشر على أسطح المجسمات ثلاثية الأبعاد (3D Surface Texture Painter)
 * يتعرف تلقائياً على أبعاد وشكل المجسم، وينشئ طبقة رسم ثلاثية الأبعاد تلتصق بسطح اللوح
 */
export class MeshSurfacePainter {
  constructor(viewer) {
    this.viewer = viewer;
    this.active = false;
    this.cameraLocked = true;

    this.tool = 'pen'; // 'pen', 'wedge-h', 'wedge-v', 'wedge-w', 'eraser'
    this.color = '#0a0a0a';
    this.lineWidth = 6;
    this.opacity = 1.0;

    this.textureSize = 2048;
    this.drawingCanvas = document.createElement('canvas');
    this.drawingCanvas.width = this.textureSize;
    this.drawingCanvas.height = this.textureSize;
    this.ctx = this.drawingCanvas.getContext('2d');

    this.drawingTexture = new THREE.CanvasTexture(this.drawingCanvas);
    this.drawingTexture.anisotropy = 8;

    this.overlayMeshes = [];
    this.isDrawing = false;
    this.prevUV = null;
    this.strokeHistory = [];
    this.undoStack = [];

    // مؤشر القلم ثلاثي الأبعاد على سطح اللوح (3D Surface Cursor Reticle)
    this.initReticle();
    this.initEvents();
  }

  /**
   * إنشاء مؤشر دائري يلتصق بانحناءات سطح اللوح ليوضح مكان الرسم بدقة
   */
  initReticle() {
    const ringGeo = new THREE.RingGeometry(0.04, 0.055, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.8
    });
    this.reticle = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.visible = false;
    this.reticle.renderOrder = 999;
    this.viewer.scene.add(this.reticle);
  }

  /**
   * تحليل أبعاد وشكل المجسم تلقائياً وتجهيز طبقة الرسم المطابقة له 100%
   */
  attachToModel(targetObject3D) {
    // 1. تنظيف أي طبقات رسم سابقة
    this.removeOverlayMeshes();

    if (!targetObject3D) return null;

    // 2. حساب الأبعاد الدقيقة للمجسم (Bounding Box)
    const bbox = new THREE.Box3().setFromObject(targetObject3D);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    this.modelDimensions = {
      width: (size.x * 10).toFixed(1),   // تحويل تقريبي للسنتمتر
      height: (size.y * 10).toFixed(1),
      depth: (size.z * 10).toFixed(1),
      rawSize: size,
      center: center
    };

    // 3. تجميع المجسمات المستهدفة أولاً في مصفوفة مستقلة لمنع أي تكرار لانهائي (Infinite Recursion Safe)
    const meshesToProcess = [];
    targetObject3D.traverse((child) => {
      if (child.isMesh && child.geometry && child.name !== "DrawingSurfaceOverlay") {
        meshesToProcess.push(child);
      }
    });

    // 4. بناء طبقة رسم ثلاثية الأبعاد مطابقة للمجسم
    for (const mesh of meshesToProcess) {
      this.ensureUVCoordinates(mesh.geometry);

      const overlayMat = new THREE.MeshBasicMaterial({
        map: this.drawingTexture,
        transparent: true,
        opacity: this.opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
        side: THREE.DoubleSide
      });

      const overlayMesh = new THREE.Mesh(mesh.geometry, overlayMat);
      overlayMesh.name = "DrawingSurfaceOverlay";
      mesh.add(overlayMesh);
      this.overlayMeshes.push(overlayMesh);
    }

    return this.modelDimensions;
  }

  /**
   * التأكد من وجود إحداثيات UV أو توليدها تلقائياً للمجسمات المستوردة
   */
  ensureUVCoordinates(geometry) {
    if (!geometry.attributes.uv) {
      const pos = geometry.attributes.position;
      const uvs = new Float32Array(pos.count * 2);
      const bbox = geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(pos);
      const spanX = (bbox.max.x - bbox.min.x) || 1;
      const spanY = (bbox.max.y - bbox.min.y) || 1;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uvs[i * 2]     = (x - bbox.min.x) / spanX;
        uvs[i * 2 + 1] = (y - bbox.min.y) / spanY;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
  }

  removeOverlayMeshes() {
    this.overlayMeshes.forEach(mesh => {
      if (mesh.parent) mesh.parent.remove(mesh);
      if (mesh.material) mesh.material.dispose();
    });
    this.overlayMeshes = [];
  }

  setActive(active) {
    this.active = active;
    this.reticle.visible = active;
    this.viewer.controls.enabled = !this.cameraLocked || !active;
    const canvasEl = this.viewer.renderer.domElement;
    if (active) {
      canvasEl.style.cursor = 'crosshair';
    } else {
      canvasEl.style.cursor = 'default';
    }
  }

  setCameraLock(locked) {
    this.cameraLocked = locked;
    if (this.active) {
      this.viewer.controls.enabled = !locked;
    }
  }

  setTool(tool) {
    this.tool = tool;
  }

  setColor(color) {
    this.color = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  setOpacity(opacity) {
    this.opacity = opacity;
    this.overlayMeshes.forEach(mesh => {
      if (mesh.material) mesh.material.opacity = opacity;
    });
  }

  initEvents() {
    const dom = this.viewer.renderer.domElement;

    const getRaycastHit = (e) => {
      if (!this.viewer.tabletMesh) return null;
      const rect = dom.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const pointer = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );

      this.viewer.raycaster.setFromCamera(pointer, this.viewer.camera);
      const intersects = this.viewer.raycaster.intersectObject(this.viewer.tabletMesh, true);
      
      const validHit = intersects.find(hit => hit.object.name !== "DrawingSurfaceOverlay");
      return validHit || null;
    };

    dom.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const hit = getRaycastHit(e);

      if (hit && hit.point && hit.face) {
        this.reticle.visible = true;
        this.reticle.position.copy(hit.point);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
        this.reticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), worldNormal);
        this.reticle.position.addScaledVector(worldNormal, 0.012);

        if (this.isDrawing && hit.uv && this.cameraLocked) {
          this.paintAtUV(hit.uv);
        }
      } else {
        this.reticle.visible = false;
      }
    });

    dom.addEventListener('pointerdown', (e) => {
      if (!this.active || !this.cameraLocked || e.button !== 0) return;
      const hit = getRaycastHit(e);
      if (hit && hit.uv) {
        this.isDrawing = true;
        this.saveStateToUndo();
        this.startStrokeAtUV(hit.uv);
      }
    });

    const stopDrawing = () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.prevUV = null;
        this.strokeStartUV = null;
      }
    };

    window.addEventListener('pointerup', stopDrawing);
    dom.addEventListener('pointerleave', () => { this.reticle.visible = false; });
  }

  saveStateToUndo() {
    const snapshot = this.ctx.getImageData(0, 0, this.textureSize, this.textureSize);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 20) this.undoStack.shift();
  }

  undo() {
    if (this.undoStack.length > 0) {
      const lastState = this.undoStack.pop();
      this.ctx.putImageData(lastState, 0, 0);
      this.drawingTexture.needsUpdate = true;
    }
  }

  clear() {
    this.saveStateToUndo();
    this.ctx.clearRect(0, 0, this.textureSize, this.textureSize);
    this.drawingTexture.needsUpdate = true;
  }

  startStrokeAtUV(uv) {
    this.prevUV = uv.clone();
    this.strokeStartUV = uv.clone();

    const px = uv.x * this.textureSize;
    const py = (1.0 - uv.y) * this.textureSize;

    if (this.tool === 'pen') {
      this.ctx.save();
      this.ctx.fillStyle = this.color;
      this.ctx.beginPath();
      this.ctx.arc(px, py, this.lineWidth, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      this.drawingTexture.needsUpdate = true;
    } else if (this.tool.startsWith('wedge-')) {
      this.stampWedgeAtUV(this.tool, uv, this.lineWidth * 2.5);
    }
  }

  paintAtUV(uv) {
    if (!this.prevUV) {
      this.prevUV = uv.clone();
      return;
    }

    const x1 = this.prevUV.x * this.textureSize;
    const y1 = (1.0 - this.prevUV.y) * this.textureSize;
    const x2 = uv.x * this.textureSize;
    const y2 = (1.0 - uv.y) * this.textureSize;

    const dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    if (dist < 1) return;

    this.ctx.save();

    if (this.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
      this.ctx.lineWidth = this.lineWidth * 3.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    } else if (this.tool === 'pen') {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.lineWidth * 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.prevUV = uv.clone();
    this.drawingTexture.needsUpdate = true;
  }

  stampWedgeAtUV(wedgeType, uv, size) {
    const cx = uv.x * this.textureSize;
    const cy = (1.0 - uv.y) * this.textureSize;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = this.color;

    if (wedgeType === 'wedge-h') {
      const len = size * 3.2;
      const headW = size * 1.4;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx + headW * 0.8, cy - headW * 0.5);
      this.ctx.lineTo(cx + len, cy);
      this.ctx.lineTo(cx + headW * 0.8, cy + headW * 0.5);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (wedgeType === 'wedge-v') {
      const len = size * 3.5;
      const headW = size * 1.4;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx - headW * 0.5, cy + headW * 0.8);
      this.ctx.lineTo(0, len);
      this.ctx.lineTo(cx + headW * 0.5, cy + headW * 0.8);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (wedgeType === 'wedge-w') {
      const wSize = size * 2.0;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx + wSize * 0.8, cy - wSize * 0.4);
      this.ctx.lineTo(cx + wSize * 0.35, cy + wSize * 0.35);
      this.ctx.lineTo(cx - wSize * 0.4, cy + wSize * 0.8);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
    this.drawingTexture.needsUpdate = true;
  }

  exportTexturePNG() {
    const link = document.createElement('a');
    link.href = this.drawingCanvas.toDataURL('image/png');
    link.download = `Cuneiform_3D_Surface_Drawing_${Date.now()}.png`;
    link.click();
  }

  exportSVG() {
    const dataURL = this.drawingCanvas.toDataURL('image/png');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.textureSize} ${this.textureSize}" width="${this.textureSize}" height="${this.textureSize}">
  <title>Cuneiform 3D Surface Inking</title>
  <image href="${dataURL}" x="0" y="0" width="${this.textureSize}" height="${this.textureSize}" />
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cuneiform_3D_Surface_Vector_${Date.now()}.svg`;
    link.click();
  }
}
