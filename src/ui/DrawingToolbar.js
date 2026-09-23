/**
 * شريط أدوات الرسم ثلاثي الأبعاد المباشر على سطح اللوح (3D Surface Inking Toolbar)
 */
export class DrawingToolbar {
  constructor(meshSurfacePainter, viewer) {
    this.painter = meshSurfacePainter;
    this.viewer = viewer;
    this.isOpen = false;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    const toolbarHTML = `
      <div id="drawing-toolbar" class="drawing-toolbar hidden">
        <div class="toolbar-drag-handle">
          <div class="toolbar-header-info">
            <span class="toolbar-title">✍️ طبقة الرسم ثلاثية الأبعاد على سطح اللوح (3D Surface Layer)</span>
            <span id="model-dimension-badge" class="model-dimensions-chip">📏 جاري قياس الأبعاد...</span>
          </div>
          <button id="close-drawing-btn" class="tb-close-btn" title="إنهاء وضع الرسم">✕</button>
        </div>

        <div class="toolbar-body">
          <!-- 1. اختيار الأدوات -->
          <div class="tb-group tools-group">
            <button class="tb-tool-btn active" data-tool="pen" title="قلم تتبع حر يرسم مباشرة على الطين">
              <span class="icon">🖊️</span>
              <span class="label">قلم 3D</span>
            </button>
            <button class="tb-tool-btn" data-tool="wedge-h" title="طبع وتد مسماري أفقي (𒀸) على السطح">
              <span class="icon">𒀸</span>
              <span class="label">وتد أفقي</span>
            </button>
            <button class="tb-tool-btn" data-tool="wedge-v" title="طبع وتد مسماري عمودي (𒁹) على السطح">
              <span class="icon">𒁹</span>
              <span class="label">وتد عمودي</span>
            </button>
            <button class="tb-tool-btn" data-tool="wedge-w" title="طبع وتد زاوي وينكلهوكن (𒌋)">
              <span class="icon">𒌋</span>
              <span class="label">وينكلهوكن</span>
            </button>
            <button class="tb-tool-btn" data-tool="eraser" title="ممحاة للرسم ثلاثي الأبعاد">
              <span class="icon">🧹</span>
              <span class="label">ممحاة</span>
            </button>
          </div>

          <div class="tb-divider"></div>

          <!-- 2. الألوان التوثيقية -->
          <div class="tb-group colors-group">
            <span class="group-label">اللون:</span>
            <div class="color-chips">
              <button class="color-chip active" data-color="#0a0a0a" style="background:#0a0a0a" title="حبر هندي أسود أثري"></button>
              <button class="color-chip" data-color="#dc2626" style="background:#dc2626" title="أحمر توثيقي أكاديمي"></button>
              <button class="color-chip" data-color="#06b6d4" style="background:#06b6d4" title="أزرق فيروزي مميز"></button>
              <button class="color-chip" data-color="#d4af37" style="background:#d4af37" title="ذهبي أثري"></button>
              <button class="color-chip" data-color="#ffffff" style="background:#ffffff" title="أبيض ناصع"></button>
            </div>
          </div>

          <div class="tb-divider"></div>

          <!-- 3. سمك ونعومة الخط وشفافية الطبقة -->
          <div class="tb-group sliders-group">
            <div class="tb-slider-item">
              <span class="slider-title">سمك القلم (<span id="line-width-val">6</span>px)</span>
              <input type="range" id="draw-line-width" min="2" max="24" value="6" />
            </div>
            <div class="tb-slider-item">
              <span class="slider-title">✨ نعومة وسوفت الخط (<span id="draw-softness-val">75</span>%)</span>
              <input type="range" id="draw-softness" min="0" max="100" value="75" step="5" title="التحكم بنعومة وانسيابية حواف الخط والفرشاة" />
            </div>
            <div class="tb-slider-item">
              <span class="slider-title">شفافية الطبقة (<span id="layer-opacity-val">100</span>%)</span>
              <input type="range" id="draw-opacity" min="0.1" max="1.0" step="0.05" value="1.0" />
            </div>
          </div>

          <div class="tb-divider"></div>

          <!-- 4. قفل الكاميرا والتراجع -->
          <div class="tb-group actions-group">
            <button id="lock-camera-btn" class="tb-action-btn active" title="قفل الكاميرا للرسم فوق اللوح أو تحريرها لتدويره ومعاينته">
              <span class="icon">🔒</span>
              <span class="label">الكاميرا مقفلة للرسم</span>
            </button>
            <div class="undo-redo-row">
              <button id="draw-undo-btn" class="tb-mini-btn" title="تراجع (Ctrl+Z)">↩️</button>
              <button id="draw-clear-btn" class="tb-mini-btn" title="مسح طبقة الرسم بالكامل">🗑️</button>
            </div>
          </div>

          <div class="tb-divider"></div>

          <!-- 5. أزرار التصدير فائق الدقة (SVG & PNG) -->
          <div class="tb-group export-group">
            <span class="group-label">تصدير الرسم:</span>
            <div class="export-buttons-row">
              <button id="export-svg-btn" class="tb-export-btn highlight" title="تصدير كملف متجهي SVG عالي الدقة">
                <span>📐 تصدير SVG متجهي</span>
              </button>
              <button id="export-png-btn" class="tb-export-btn" title="تصدير خريطة الرسم بدقة 2048x2048 كـ PNG">
                <span>🖼️ تصدير خريطة الرسم (PNG)</span>
              </button>
              <button id="export-merged-btn" class="tb-export-btn" title="التقاط لقطة للمجسم مع الرسم والظلال الحالية">
                <span>📸 لقطة المجسم مع الرسم</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('app').insertAdjacentHTML('beforeend', toolbarHTML);
    this.toolbarEl = document.getElementById('drawing-toolbar');
  }

  updateDimensionsBadge(dims) {
    const badge = document.getElementById('model-dimension-badge');
    if (badge && dims) {
      badge.innerText = `📐 أبعاد المجسم: ${dims.width} × ${dims.height} × ${dims.depth} سم`;
      badge.style.display = 'inline-block';
    }
  }

  open() {
    this.isOpen = true;
    this.toolbarEl.classList.remove('hidden');
    this.painter.setActive(true);
    if (this.painter.modelDimensions) {
      this.updateDimensionsBadge(this.painter.modelDimensions);
    }
    const mobBtn = document.getElementById('mob-drawing-btn');
    if (mobBtn) mobBtn.classList.add('active');
    const headerBtn = document.getElementById('open-drawing-btn');
    if (headerBtn) headerBtn.classList.add('active');
  }

  close() {
    this.isOpen = false;
    this.toolbarEl.classList.add('hidden');
    this.painter.setActive(false);
    const mobBtn = document.getElementById('mob-drawing-btn');
    if (mobBtn) mobBtn.classList.remove('active');
    const headerBtn = document.getElementById('open-drawing-btn');
    if (headerBtn) headerBtn.classList.remove('active');
  }

  bindEvents() {
    document.getElementById('close-drawing-btn').addEventListener('click', () => {
      this.close();
    });

    this.toolbarEl.querySelectorAll('.tb-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toolbarEl.querySelectorAll('.tb-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = btn.getAttribute('data-tool');
        this.painter.setTool(tool);
      });
    });

    this.toolbarEl.querySelectorAll('.color-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toolbarEl.querySelectorAll('.color-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.getAttribute('data-color');
        this.painter.setColor(color);
      });
    });

    const widthSlider = document.getElementById('draw-line-width');
    widthSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('line-width-val').innerText = val;
      this.painter.setLineWidth(val);
    });

    const softnessSlider = document.getElementById('draw-softness');
    if (softnessSlider) {
      softnessSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const valEl = document.getElementById('draw-softness-val');
        if (valEl) valEl.innerText = val;
        this.painter.setSoftness(val / 100);
      });
    }

    const opacitySlider = document.getElementById('draw-opacity');
    opacitySlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('layer-opacity-val').innerText = Math.round(val * 100);
      this.painter.setOpacity(val);
    });

    const lockBtn = document.getElementById('lock-camera-btn');
    lockBtn.addEventListener('click', () => {
      const isLocked = !this.painter.cameraLocked;
      this.painter.setCameraLock(isLocked);
      lockBtn.classList.toggle('active', isLocked);
      lockBtn.querySelector('.icon').innerText = isLocked ? '🔒' : '🔓';
      lockBtn.querySelector('.label').innerText = isLocked ? 'الكاميرا مقفلة للرسم' : 'الكاميرا حرة للتدوير';
    });

    document.getElementById('draw-undo-btn').addEventListener('click', () => this.painter.undo());
    document.getElementById('draw-clear-btn').addEventListener('click', () => {
      if (confirm('هل ترغب في مسح طبقة الرسم ثلاثية الأبعاد بالكامل؟')) {
        this.painter.clear();
      }
    });

    // تصدير SVG
    document.getElementById('export-svg-btn').addEventListener('click', () => {
      this.painter.exportSVG();
    });

    // تصدير PNG خريطة الرسم ثلاثية الأبعاد
    document.getElementById('export-png-btn').addEventListener('click', () => {
      this.painter.exportTexturePNG();
    });

    // تصدير لقطة مدمجة مع اللوح
    document.getElementById('export-merged-btn').addEventListener('click', () => {
      this.viewer.takeSnapshot();
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        this.painter.undo();
      }
    });
  }
}
