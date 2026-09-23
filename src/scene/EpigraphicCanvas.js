/**
 * محرك استوديو الرسم والتتبع الأثري (Epigraphic Inking & Tracing Canvas)
 * يتيح الشف والتتبع والرسم المتجهي فوق الألواح المسمارية وتصدير PNG/SVG عالي الدقة
 */
export class EpigraphicCanvas {
  constructor(containerElement, viewer) {
    this.container = containerElement;
    this.viewer = viewer;

    this.active = false;
    this.cameraLocked = true;
    this.tool = 'pen'; // 'pen', 'wedge-h', 'wedge-v', 'wedge-w', 'eraser'
    this.color = '#0a0a0a'; // حبر أسود أثري كلاسيكي
    this.lineWidth = 3;
    this.opacity = 1.0;

    this.strokes = [];
    this.undoStack = [];
    this.currentStroke = null;
    this.isDrawing = false;

    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'epigraphic-drawing-canvas';
    this.canvas.className = 'epigraphic-canvas hidden';
    this.ctx = this.canvas.getContext('2d');

    this.container.appendChild(this.canvas);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    this.redraw();
  }

  setActive(active) {
    this.active = active;
    if (active) {
      this.canvas.classList.remove('hidden');
      this.viewer.controls.enabled = !this.cameraLocked;
      this.resize();
    } else {
      this.canvas.classList.add('hidden');
      this.viewer.controls.enabled = true;
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
    this.canvas.style.opacity = opacity;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      if (this.active) this.resize();
    });

    const getCanvasPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const onPointerDown = (e) => {
      if (!this.active || !this.cameraLocked) return;
      e.preventDefault();
      this.isDrawing = true;
      const pos = getCanvasPos(e);

      this.currentStroke = {
        type: this.tool,
        color: this.color,
        lineWidth: this.lineWidth,
        points: [pos],
        startPos: pos,
        currentPos: pos
      };
    };

    const onPointerMove = (e) => {
      if (!this.active || !this.isDrawing || !this.currentStroke) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      this.currentStroke.currentPos = pos;

      if (this.tool === 'pen' || this.tool === 'eraser') {
        this.currentStroke.points.push(pos);
      }

      this.redraw();
      this.renderCurrentStrokePreview();
    };

    const onPointerUp = (e) => {
      if (!this.isDrawing || !this.currentStroke) return;
      this.isDrawing = false;

      // حفظ الخط في التاريخ
      this.strokes.push(this.currentStroke);
      this.undoStack = []; // تفريغ الـ Redo
      this.currentStroke = null;
      this.redraw();
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  }

  /**
   * إعادة رسم كافة المسارات المسجلة
   */
  redraw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const stroke of this.strokes) {
      this.drawStroke(this.ctx, stroke);
    }
  }

  /**
   * معاينة مباشرة للخط أثناء سحب الفأرة
   */
  renderCurrentStrokePreview() {
    if (!this.currentStroke) return;
    this.drawStroke(this.ctx, this.currentStroke, true);
  }

  /**
   * رسم ضربة أو شكل وتد هندسي
   */
  drawStroke(ctx, stroke, isPreview = false) {
    ctx.save();

    if (stroke.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = stroke.lineWidth * 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const pts = stroke.points;
      if (pts.length > 0) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isPreview) {
      ctx.globalAlpha = 0.85;
    }

    switch (stroke.type) {
      case 'pen':
        this.drawSmoothFreehand(ctx, stroke.points, stroke.lineWidth, stroke.color);
        break;

      case 'wedge-h':
        // وتد مسماري أفقي حقيقي
        this.renderHorizontalWedge(ctx, stroke.startPos, stroke.currentPos, stroke.lineWidth);
        break;

      case 'wedge-v':
        // وتد مسماري عمودي حقيقي
        this.renderVerticalWedge(ctx, stroke.startPos, stroke.currentPos, stroke.lineWidth);
        break;

      case 'wedge-w':
        // وتد وينكلهوكن (Winkelhaken)
        this.renderWinkelhakenWedge(ctx, stroke.startPos, stroke.currentPos, stroke.lineWidth);
        break;
    }

    ctx.restore();
  }

  /**
   * تنعيم الخطوط الحرة بخوارزمية المنحنيات التربيعية (Bezier Spline)
   */
  drawSmoothFreehand(ctx, points, width, color) {
    if (points.length < 2) {
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  /**
   * رسم وتد مسماري أفقي من البداية حتى السحب (Wedge 𒀸)
   */
  renderHorizontalWedge(ctx, start, end, baseSize) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.max(15, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    const headW = Math.max(12, baseSize * 4);

    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0); // رأس المثلث
    ctx.lineTo(headW * 0.8, -headW * 0.5);
    ctx.lineTo(len, 0); // ذيل الوتد الممتد
    ctx.lineTo(headW * 0.8, headW * 0.5);
    ctx.closePath();
    ctx.fill();

    // خط حافة داخلي لإعطاء إحساس ثلاثي الأبعاد بالأخدود
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * رسم وتد مسماري عمودي (Wedge 𒁹)
   */
  renderVerticalWedge(ctx, start, end, baseSize) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.max(15, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    const headW = Math.max(12, baseSize * 4);

    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headW * 0.5, headW * 0.8);
    ctx.lineTo(0, len);
    ctx.lineTo(headW * 0.5, headW * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * رسم وتد زاوي وينكلهوكن (Winkelhaken 𒌋)
   */
  renderWinkelhakenWedge(ctx, start, end, baseSize) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const size = Math.max(16, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.8, -size * 0.4);
    ctx.lineTo(size * 0.4, -size * 0.1);
    ctx.lineTo(size * 0.1, size * 0.4);
    ctx.lineTo(-size * 0.4, size * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  undo() {
    if (this.strokes.length > 0) {
      this.undoStack.push(this.strokes.pop());
      this.redraw();
    }
  }

  redo() {
    if (this.undoStack.length > 0) {
      this.strokes.push(this.undoStack.pop());
      this.redraw();
    }
  }

  clear() {
    if (this.strokes.length > 0) {
      this.undoStack.push(...this.strokes);
      this.strokes = [];
      this.redraw();
    }
  }

  /**
   * تصدير الرسم كملف متجهي SVG عالي الدقة بدون أي فقدان للجودة (Vector SVG)
   */
  exportSVG() {
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  <style>
    .cuneiform-stroke { stroke-linecap: round; stroke-linejoin: round; }
  </style>
  <rect width="100%" height="100%" fill="none"/>
  <g id="cuneiform-epigraphic-drawing">
`;

    for (const stroke of this.strokes) {
      if (stroke.type === 'eraser') continue;

      if (stroke.type === 'pen' && stroke.points.length > 0) {
        let d = `M ${stroke.points[0].x.toFixed(1)} ${stroke.points[0].y.toFixed(1)}`;
        for (let i = 1; i < stroke.points.length; i++) {
          d += ` L ${stroke.points[i].x.toFixed(1)} ${stroke.points[i].y.toFixed(1)}`;
        }
        svgContent += `    <path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.lineWidth}" class="cuneiform-stroke"/>\n`;
      } else if (stroke.type === 'wedge-h') {
        const dx = stroke.currentPos.x - stroke.startPos.x;
        const dy = stroke.currentPos.y - stroke.startPos.y;
        const len = Math.max(15, Math.sqrt(dx * dx + dy * dy));
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const headW = Math.max(12, stroke.lineWidth * 4);

        svgContent += `    <g transform="translate(${stroke.startPos.x.toFixed(1)}, ${stroke.startPos.y.toFixed(1)}) rotate(${angle.toFixed(1)})">
      <polygon points="0,0 ${headW * 0.8},${-headW * 0.5} ${len},0 ${headW * 0.8},${headW * 0.5}" fill="${stroke.color}"/>
    </g>\n`;
      } else if (stroke.type === 'wedge-v') {
        const dx = stroke.currentPos.x - stroke.startPos.x;
        const dy = stroke.currentPos.y - stroke.startPos.y;
        const len = Math.max(15, Math.sqrt(dx * dx + dy * dy));
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const headW = Math.max(12, stroke.lineWidth * 4);

        svgContent += `    <g transform="translate(${stroke.startPos.x.toFixed(1)}, ${stroke.startPos.y.toFixed(1)}) rotate(${angle.toFixed(1)})">
      <polygon points="0,0 ${-headW * 0.5},${headW * 0.8} 0,${len} ${headW * 0.5},${headW * 0.8}" fill="${stroke.color}"/>
    </g>\n`;
      }
    }

    svgContent += `  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cuneiform_Epigraphy_Drawing_${Date.now()}.svg`;
    link.click();
  }

  /**
   * تصدير الرسم كصورة PNG عالية الدقة (فائقة النقاء)
   */
  exportPNG(includeTabletBackground = false) {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const ectx = exportCanvas.getContext('2d');

    if (includeTabletBackground) {
      // دمج رندر المشهد ثلاثي الأبعاد مع طبقة الرسم
      ectx.drawImage(this.viewer.renderer.domElement, 0, 0, exportCanvas.width, exportCanvas.height);
    }

    // رسم طبقة التتبع
    ectx.drawImage(this.canvas, 0, 0);

    const dataURL = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `Cuneiform_Tracing_${Date.now()}.png`;
    link.click();
  }
}
