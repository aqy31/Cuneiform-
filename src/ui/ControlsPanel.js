import { lightingPresets, clayMaterials } from '../data/cuneiformTexts.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export class ControlsPanel {
  constructor(viewer, readerModal, drawingToolbar, magnifierLoupe, signDictionaryModal) {
    this.viewer = viewer;
    this.readerModal = readerModal;
    this.drawingToolbar = drawingToolbar;
    this.magnifierLoupe = magnifierLoupe;
    this.signDictionaryModal = signDictionaryModal;
    this.isDraggingDome = false;
    this.isMacroActive = false;

    this.initDOM();
    this.bindEvents();
    this.updateDomeHandle(this.viewer.lighting.azimuth, this.viewer.lighting.elevation);
  }

  initDOM() {
    const panelHTML = `
      <!-- الشريط العلوي الرئيسي للهيدر (متجاوب للهاتف وسطح المكتب) -->
      <header class="app-header">
        <div class="brand-group">
          <div class="brand-logo-gem">𒀭</div>
          <div>
            <h1 class="brand-title">مختبر الفحص المسماري 3D</h1>
            <span class="brand-tag">Cuneiform RTI Studio</span>
          </div>
        </div>

        <div class="header-quick-actions">
          <!-- زر لوحة الرسم وتتبع النقوش -->
          <button id="open-drawing-btn" class="glow-button drawing-trigger-btn" title="فتح لوحة الرسم ثلاثية الأبعاد">
            <span class="btn-icon">✍️</span>
            <span class="btn-text">رسم 3D</span>
          </button>

          <!-- زر قراءة وترجمة النص -->
          <button id="open-reader-btn" class="action-btn highlight-gold">
            <span class="btn-icon">📜</span>
            <span class="btn-text">النص المسماري</span>
          </button>

          <!-- زر معجم الرموز المسمارية -->
          <button id="open-dictionary-btn" class="action-btn" title="معجم العلامات المسمارية">
            <span class="btn-icon">📖</span>
            <span class="btn-text">معجم الرموز</span>
          </button>

          <!-- زر العدسة المكبرة التفاعلية -->
          <button id="toggle-loupe-btn" class="action-btn" title="العدسة المكبرة">
            <span class="btn-icon">🔍</span>
            <span class="btn-text">العدسة</span>
          </button>

          <!-- زر قلب اللوح السريع -->
          <button id="flip-tablet-btn" class="action-btn" title="قلب اللوح 180°">
            <span class="btn-icon">🔃</span>
            <span class="btn-text">قلب اللوح</span>
          </button>

          <!-- زر التقاط لقطة شاشة عالية الدقة -->
          <button id="snapshot-btn" class="action-btn" title="التقاط صورة توثيقية">
            <span class="btn-icon">📸</span>
            <span class="btn-text">لقطة</span>
          </button>

          <!-- زر استيراد مجسم GLB خاص -->
          <label class="action-btn file-input-label highlight-btn" title="استيراد مجسم GLB">
            <span class="btn-icon">📦</span>
            <span class="btn-text">استيراد GLB</span>
            <input type="file" id="custom-model-input" accept=".glb,.gltf,.obj" style="display:none;" />
          </label>

          <!-- زر فتح الموقع على الهاتف بالـ QR Code -->
          <button id="open-phone-qr-btn" class="action-btn highlight-gold desktop-only" title="فتح الموقع على الهاتف مباشرة عبر مسح الرمز بالكميرا">
            <span class="btn-icon">📱</span>
            <span class="btn-text">فتح بالهاتف</span>
          </button>
        </div>
      </header>

      <!-- زر عائم دائم لفتح/إغلاق لوحة الإضاءة والشيدر (لا يختفي أبداً حتى في الهاتف) -->
      <button id="floating-sidebar-toggle-btn" class="floating-sidebar-btn" title="فتح لوحة أدوات الإضاءة والأشعة">
        <span class="icon">🎛️</span>
        <span class="txt">أدوات الفحص</span>
      </button>

      <!-- اللوحة الجانبية العائمة: أدوات الإضاءة والشيدر والمواد -->
      <aside class="controls-sidebar">
        <div class="sidebar-drag-handle-mobile"><span></span></div>
        <div class="sidebar-header">
          <h3>🎛️ أدوات الفحص والأشعة (RTI)</h3>
          <button id="toggle-sidebar-btn" class="mini-close" title="إغلاق اللوحة">✕</button>
        </div>

        <div class="sidebar-scrollable">
          <!-- بطاقة الرسم والأدوات المتقدمة -->
          <section class="control-card epigraphy-tools-card">
            <h4>🔬 أدوات التوثيق والإبيغرافيا</h4>
            <div class="quick-epigraphy-grid">
              <button id="sidebar-draw-btn" class="epigraphy-btn primary">
                <span>✍️ لوحة الرسم ثلاثي الأبعاد على اللوح</span>
              </button>
              <button id="sidebar-macro-btn" class="epigraphy-btn">
                <span id="macro-btn-label">🔎 تقريب فائق (Super Macro)</span>
              </button>
              <button id="sidebar-lineart-btn" class="epigraphy-btn">
                <span id="lineart-btn-label">🔲 نمط الرسم الخطي (B/W)</span>
              </button>
            </div>
          </section>

          <!-- قسم اختيار وإدارة مجسمات 3D الأصلية -->
          <section class="control-card glb-card">
            <h4>🏺 المجسمات ثلاثية الأبعاد (3D Scans)</h4>
            <div class="model-switcher-row">
              <button id="switch-ur-tablet-btn" class="model-choice-btn active" title="لوح أور المسماري الأثري (الأصلي)">
                <span class="icon">🏺</span>
                <span class="name">لوح أور الأصلي</span>
              </button>
              <button id="switch-cylinder-btn" class="model-choice-btn" title="أسطوانة نبوخذ نصر المسمارية">
                <span class="icon">📜</span>
                <span class="name">أسطوانة نبوخذ نصر</span>
              </button>
            </div>
            <div id="model-status-indicator" class="model-status">
              <span>المجسم الحالي:</span>
              <strong id="current-model-name">لوح أور المسماري الأثري (أصلي)</strong>
            </div>
            <div class="glb-actions-row">
              <label class="glb-upload-box" for="custom-model-input-sidebar">
                <span class="upload-icon">📂</span>
                <span>استيراد ملف GLB آخر من جهازك</span>
                <input type="file" id="custom-model-input-sidebar" accept=".glb,.gltf,.obj" style="display:none;" />
              </label>
              <button id="export-glb-btn" class="export-glb-btn" title="تحميل وتصدير هذا المجسم كملف GLB">
                💾 تصدير GLB
              </button>
            </div>
          </section>

          <!-- 1. قبة الإضاءة التفاعلية (Virtual Light Dome) -->
          <section class="control-card dome-section">
            <div class="section-title-row">
              <h4>قبة الإضاءة التفاعلية</h4>
              <span id="light-angle-badge" class="badge">135° / 22°</span>
            </div>
            <p class="section-hint">حرّك النقطة الذهبية لتغيير زاوية سقوط الضوء المائل والظلال لحظياً:</p>
            
            <div class="dome-wrapper">
              <div id="virtual-dome" class="virtual-dome">
                <div class="dome-ring outer-ring"></div>
                <div class="dome-ring mid-ring"></div>
                <div class="dome-axis x-axis"></div>
                <div class="dome-axis y-axis"></div>
                <div id="dome-sun-handle" class="dome-handle">
                  <div class="sun-glow"></div>
                </div>
              </div>
            </div>
          </section>

          <!-- 2. الأوضاع الأثرية الجاهزة (Lighting Presets) -->
          <section class="control-card">
            <h4>أنماط الفحص الأثري السريعة</h4>
            <div class="presets-grid">
              ${lightingPresets.map(preset => `
                <button class="preset-card ${preset.id === 'raking-light' ? 'active' : ''}" data-preset-id="${preset.id}">
                  <span class="preset-icon">${preset.icon}</span>
                  <div class="preset-info">
                    <span class="preset-name">${preset.name}</span>
                  </div>
                </button>
              `).join('')}
            </div>
          </section>

          <!-- 3. أشرطة ضبط الإضاءة والظلال الدقيقة -->
          <section class="control-card">
            <h4>إعدادات الظلال والانعكاس</h4>

            <div class="slider-row">
              <div class="slider-label-row">
                <span>زاوية الارتفاع (الضوء المائل)</span>
                <span id="elevation-val">22°</span>
              </div>
              <input type="range" id="elevation-slider" min="5" max="85" value="22" step="1" />
            </div>

            <div class="slider-row">
              <div class="slider-label-row">
                <span>شدة الضوء</span>
                <span id="intensity-val">2.8x</span>
              </div>
              <input type="range" id="intensity-slider" min="0.5" max="5.0" value="2.8" step="0.1" />
            </div>

            <div class="slider-row">
              <div class="slider-label-row">
                <span>عتمة الظلال (Shadow Depth)</span>
                <span id="shadow-val">85%</span>
              </div>
              <input type="range" id="shadow-slider" min="0.1" max="1.0" value="0.85" step="0.05" />
            </div>

            <div class="slider-row">
              <div class="slider-label-row">
                <span>بروز عمق المسامير (Relief)</span>
                <span id="relief-val">1.6x</span>
              </div>
              <input type="range" id="relief-slider" min="0.5" max="3.5" value="1.6" step="0.1" />
            </div>

            <div class="slider-row">
              <div class="slider-label-row">
                <span>حرارة الضوء (Color Temp)</span>
                <span id="kelvin-val">3800K</span>
              </div>
              <input type="range" id="kelvin-slider" min="2200" max="6500" value="3800" step="100" />
            </div>
          </section>

          <!-- 4. اتجاهات وتقليب اللوح -->
          <section class="control-card">
            <h4>تقليب اللوح ثلاثي الأبعاد</h4>
            <div class="flip-buttons-row">
              <button class="flip-btn" data-side="obverse">الوجه الأول</button>
              <button class="flip-btn" data-side="reverse">القفا (الظهر)</button>
              <button class="flip-btn" data-side="upperEdge">الحافة العلوية</button>
              <button class="flip-btn" data-side="lowerEdge">الحافة السفلية</button>
            </div>
          </section>

          <!-- 5. خيارات العرض المساعدة -->
          <section class="control-card toggles-card">
            <label class="toggle-switch-row">
              <span>إظهار مصدر ومسار الضوء في المشهد</span>
              <input type="checkbox" id="show-helpers-chk" checked />
            </label>
            <label class="toggle-switch-row">
              <span>مصباح يدوي أثري (يتبع مؤشر الفأرة)</span>
              <input type="checkbox" id="torch-mode-chk" />
            </label>
          </section>
        </div>
      </aside>

      <!-- الشريط السفلي لسطح المكتب -->
      <div class="bottom-floating-bar desktop-only">
        <div class="interaction-hint">
          <span>🖱️ اسحب للتدوير الحر • زر الفأرة الأيمن للتحريك • عجلة الفأرة للتكبير</span>
        </div>
        <button id="macro-bottom-btn" class="pill-btn highlight">🔍 تقريب فائق (Super Macro)</button>
        <button id="reset-cam-btn" class="pill-btn">🎯 ضبط المشهد</button>
      </div>

      <!-- شريط التنقل السفلي المريح المخصص للهاتف المحمول (Mobile Touch Navigation) -->
      <nav class="mobile-nav-bar">
        <button id="mob-sidebar-btn" class="mob-btn active">
          <span class="icon">🎛️</span>
          <span class="lbl">الإضاءة</span>
        </button>
        <button id="mob-drawing-btn" class="mob-btn">
          <span class="icon">✍️</span>
          <span class="lbl">رسم 3D</span>
        </button>
        <button id="mob-reader-btn" class="mob-btn">
          <span class="icon">📜</span>
          <span class="lbl">النصوص</span>
        </button>
        <button id="mob-dict-btn" class="mob-btn">
          <span class="icon">📖</span>
          <span class="lbl">المعجم</span>
        </button>
        <button id="mob-flip-btn" class="mob-btn">
          <span class="icon">🔃</span>
          <span class="lbl">قلب</span>
        </button>
      </nav>

      <!-- نافذة QR Code لفتح الموقع على الهاتف مباشرة -->
      <div id="phone-qr-modal" class="reader-backdrop hidden">
        <div class="reader-modal-container" style="max-width: 440px; height: auto; text-align: center; padding: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="color: var(--gold-primary); font-size: 17px; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>📱</span> فتح الموقع على هاتفك
            </h3>
            <button id="close-phone-qr-btn" class="close-btn">✕</button>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.6;">
            وجّه كاميرا هاتفك (iPhone أو Android) نحو الرمز أدناه ليفتح الموقع فوراً وبدقة كاملة:
          </p>
          <div style="background: #ffffff; padding: 14px; border-radius: 16px; display: inline-block; margin-bottom: 16px; box-shadow: 0 10px 35px rgba(0,0,0,0.6);">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Faqy31.github.io%2FCuneiform-%2F" alt="QR Code" width="220" height="220" style="display: block; border-radius: 8px;" />
          </div>
          <div style="background: rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-gold); margin-bottom: 14px; direction: ltr; font-family: monospace; font-size: 13px; word-break: break-all; color: var(--gold-primary); user-select: all;">
            https://aqy31.github.io/Cuneiform-/
          </div>
          <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 10px; padding: 10px; margin-bottom: 16px; font-size: 11px; line-height: 1.5; color: #fbbf24; text-align: right;">
            💡 <b>سبب عدم الفتح سابقاً في الهاتف:</b> رابط GitHub Pages حساس لحالة الأحرف ويتطلب كتابة حرف <b>C</b> كبيراً وإبقاء علامة <b>-</b> في نهاية الرابط دون حذفها.
          </div>
          <button id="copy-qr-link-btn" class="glow-button" style="width: 100%; justify-content: center; padding: 10px 16px;">
            <span>📋 نسخ الرابط المباشر</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('app').insertAdjacentHTML('beforeend', panelHTML);
  }

  bindEvents() {
    const sidebar = document.querySelector('.controls-sidebar');
    const floatingBtn = document.getElementById('floating-sidebar-toggle-btn');
    const closeSidebarBtn = document.getElementById('toggle-sidebar-btn');

    // فتح وإغلاق الشريط الجانبي من الزر العائم الدائم أو شريط التنقل
    const toggleSidebar = (forceState) => {
      if (forceState !== undefined) {
        if (forceState) sidebar.classList.remove('collapsed');
        else sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.toggle('collapsed');
      }
      const isClosed = sidebar.classList.contains('collapsed');
      floatingBtn.style.display = isClosed ? 'flex' : 'none';
      const mobSidebarBtn = document.getElementById('mob-sidebar-btn');
      if (mobSidebarBtn) {
        if (isClosed) mobSidebarBtn.classList.remove('active');
        else mobSidebarBtn.classList.add('active');
      }
    };

    floatingBtn.addEventListener('click', () => toggleSidebar(true));
    closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));

    // ربط شريط التنقل بالهاتف المحمول للفتح والإغلاق التبادلي السلس
    document.getElementById('mob-sidebar-btn').addEventListener('click', () => {
      const isClosed = sidebar.classList.contains('collapsed');
      if (isClosed) {
        if (this.drawingToolbar.isOpen) this.drawingToolbar.close();
        toggleSidebar(true);
      } else {
        toggleSidebar(false);
      }
    });

    document.getElementById('mob-drawing-btn').addEventListener('click', () => {
      if (this.drawingToolbar.isOpen) {
        this.drawingToolbar.close();
      } else {
        toggleSidebar(false);
        this.drawingToolbar.open();
      }
    });

    document.getElementById('mob-reader-btn').addEventListener('click', () => {
      const isHidden = this.readerModal.backdrop.classList.contains('hidden');
      if (isHidden) {
        toggleSidebar(false);
        if (this.drawingToolbar.isOpen) this.drawingToolbar.close();
        this.readerModal.open();
      } else {
        this.readerModal.close();
      }
    });

    document.getElementById('mob-dict-btn').addEventListener('click', () => {
      const isHidden = this.signDictionaryModal.backdrop.classList.contains('hidden');
      if (isHidden) {
        toggleSidebar(false);
        if (this.drawingToolbar.isOpen) this.drawingToolbar.close();
        this.signDictionaryModal.open();
      } else {
        this.signDictionaryModal.close();
      }
    });

    document.getElementById('mob-flip-btn').addEventListener('click', () => {
      this.viewer.flipTabletTo('toggle');
    });

    // أزرار تبديل المجسمات الأثرية الأصلية
    const urBtn = document.getElementById('switch-ur-tablet-btn');
    const cylBtn = document.getElementById('switch-cylinder-btn');
    if (urBtn) {
      urBtn.addEventListener('click', () => {
        urBtn.classList.add('active');
        if (cylBtn) cylBtn.classList.remove('active');
        this.viewer.loadAuthenticUrTablet();
      });
    }
    if (cylBtn) {
      cylBtn.addEventListener('click', () => {
        cylBtn.classList.add('active');
        if (urBtn) urBtn.classList.remove('active');
        this.viewer.loadCylinderModel();
      });
    }

    // فتح لوحة الرسم والتتبع (Drawing Toolbar)
    const openDrawing = () => {
      if (this.drawingToolbar.isOpen) {
        this.drawingToolbar.close();
      } else {
        toggleSidebar(false);
        this.drawingToolbar.open();
      }
    };
    document.getElementById('open-drawing-btn').addEventListener('click', openDrawing);
    document.getElementById('sidebar-draw-btn').addEventListener('click', openDrawing);

    // فتح القارئ المريح
    document.getElementById('open-reader-btn').addEventListener('click', () => {
      this.readerModal.open();
    });

    // فتح معجم الرموز المسمارية
    document.getElementById('open-dictionary-btn').addEventListener('click', () => {
      this.signDictionaryModal.open();
    });

    // تفعيل العدسة المكبرة
    const loupeBtn = document.getElementById('toggle-loupe-btn');
    loupeBtn.addEventListener('click', () => {
      const active = !this.magnifierLoupe.active;
      this.magnifierLoupe.setActive(active);
      loupeBtn.classList.toggle('active', active);
    });

    // تفعيل التقريب الفائق (Super Macro)
    const toggleMacro = () => {
      this.isMacroActive = !this.isMacroActive;
      this.viewer.toggleSuperMacro(this.isMacroActive);

      const label = this.isMacroActive ? '🔎 خروج من التقريب الفائق' : '🔎 تقريب فائق (Super Macro)';
      const macroBtnLabel = document.getElementById('macro-btn-label');
      if (macroBtnLabel) macroBtnLabel.innerText = label;

      const bottomBtn = document.getElementById('macro-bottom-btn');
      if (bottomBtn) bottomBtn.innerText = this.isMacroActive ? '🔍 خروج من الماكرو' : '🔍 تقريب فائق';
    };

    document.getElementById('sidebar-macro-btn').addEventListener('click', toggleMacro);
    const bottomMacroBtn = document.getElementById('macro-bottom-btn');
    if (bottomMacroBtn) bottomMacroBtn.addEventListener('click', toggleMacro);

    // تفعيل نمط الرسم الخطي (B/W Line-Art Mode)
    let isLineArt = false;
    document.getElementById('sidebar-lineart-btn').addEventListener('click', () => {
      isLineArt = !isLineArt;
      this.viewer.setBinarizationMode(isLineArt);
      const btn = document.getElementById('sidebar-lineart-btn');
      btn.classList.toggle('active', isLineArt);
      document.getElementById('lineart-btn-label').innerText = isLineArt ? '🔲 إلغاء نمط الرسم الخطي' : '🔲 نمط الرسم الخطي (B/W)';
    });

    // قلب اللوح السريع
    document.getElementById('flip-tablet-btn').addEventListener('click', () => {
      this.viewer.flipTabletTo('toggle');
    });

    // إعادة ضبط المشهد
    const resetBtn = document.getElementById('reset-cam-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.isMacroActive = false;
        this.viewer.resetCameraView();
      });
    }

    // التقاط صورة عالية الدقة
    document.getElementById('snapshot-btn').addEventListener('click', () => {
      this.viewer.takeSnapshot();
    });

    // استيراد مجسم
    const handleFileSelect = (file) => {
      if (!file) return;
      this.viewer.loadCustomFile(file);
      const nameEl = document.getElementById('current-model-name');
      if (nameEl) nameEl.innerText = file.name;
    };

    document.getElementById('custom-model-input').addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
    });

    document.getElementById('custom-model-input-sidebar').addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
    });

    // تصدير GLB
    document.getElementById('export-glb-btn').addEventListener('click', () => {
      if (!this.viewer.tabletMesh) return;
      const exporter = new GLTFExporter();
      exporter.parse(
        this.viewer.tabletMesh,
        (result) => {
          const blob = new Blob([result], { type: 'application/octet-stream' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `cuneiform_tablet_${Date.now()}.glb`;
          link.click();
        },
        (error) => console.error('Error exporting GLB:', error),
        { binary: true }
      );
    });

    // القبة الافتراضية
    const dome = document.getElementById('virtual-dome');
    const handleDomeMove = (e) => {
      if (!this.isDraggingDome) return;
      const rect = dome.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;

      const r = rect.width / 2;
      const dist = Math.min(r, Math.sqrt(dx * dx + dy * dy));

      let angleRad = Math.atan2(dx, -dy);
      if (angleRad < 0) angleRad += Math.PI * 2;
      const azimuth = Math.round((angleRad * 180) / Math.PI);

      const elevation = Math.round(90 - (dist / r) * 85);

      this.viewer.lighting.setDirection(azimuth, elevation);
      this.updateDomeHandle(azimuth, elevation);
      this.updateSlidersFromLighting();
    };

    dome.addEventListener('mousedown', (e) => {
      this.isDraggingDome = true;
      handleDomeMove(e);
    });

    window.addEventListener('mousemove', handleDomeMove);
    window.addEventListener('mouseup', () => { this.isDraggingDome = false; });

    dome.addEventListener('touchstart', (e) => {
      this.isDraggingDome = true;
      handleDomeMove(e);
    }, { passive: true });
    window.addEventListener('touchmove', handleDomeMove, { passive: true });
    window.addEventListener('touchend', () => { this.isDraggingDome = false; });

    // السلايدرات
    const elevationSlider = document.getElementById('elevation-slider');
    elevationSlider.addEventListener('input', (e) => {
      const el = parseFloat(e.target.value);
      this.viewer.lighting.setDirection(this.viewer.lighting.azimuth, el);
      document.getElementById('elevation-val').innerText = `${el}°`;
      this.updateDomeHandle(this.viewer.lighting.azimuth, el);
    });

    const intensitySlider = document.getElementById('intensity-slider');
    intensitySlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.viewer.lighting.setIntensity(val);
      document.getElementById('intensity-val').innerText = `${val.toFixed(1)}x`;
    });

    const shadowSlider = document.getElementById('shadow-slider');
    shadowSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.viewer.lighting.setShadowDarkness(val);
      document.getElementById('shadow-val').innerText = `${Math.round(val * 100)}%`;
    });

    const reliefSlider = document.getElementById('relief-slider');
    reliefSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.viewer.builder.setReliefScale(val);
      document.getElementById('relief-val').innerText = `${val.toFixed(1)}x`;
    });

    const kelvinSlider = document.getElementById('kelvin-slider');
    kelvinSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.viewer.lighting.setColorTemperature(val);
      document.getElementById('kelvin-val').innerText = `${val}K`;
    });

    // الأنماط الجاهزة
    document.querySelectorAll('.preset-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-preset-id');
        const preset = lightingPresets.find(p => p.id === id);
        if (preset) {
          document.querySelectorAll('.preset-card').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.viewer.lighting.applyPreset(preset);
          this.viewer.setDepthAnalysisMode(!!preset.isDepthMode);
          if (preset.reliefMultiplier) {
            this.viewer.builder.setReliefScale(preset.reliefMultiplier);
          }

          this.updateSlidersFromLighting();
          this.updateDomeHandle(this.viewer.lighting.azimuth, this.viewer.lighting.elevation);
        }
      });
    });

    // أزرار التقليب
    document.querySelectorAll('.flip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = btn.getAttribute('data-side');
        this.viewer.flipTabletTo(side);
      });
    });

    // المساعد والمصباح
    document.getElementById('show-helpers-chk').addEventListener('change', (e) => {
      this.viewer.lighting.setHelpersVisible(e.target.checked);
    });

    document.getElementById('torch-mode-chk').addEventListener('change', (e) => {
      this.viewer.lighting.setTorchMode(e.target.checked);
    });

    // أحداث نافذة الـ QR Code لفتح الموقع على الهاتف
    const qrModal = document.getElementById('phone-qr-modal');
    const openQrBtn = document.getElementById('open-phone-qr-btn');
    const closeQrBtn = document.getElementById('close-phone-qr-btn');
    const copyLinkBtn = document.getElementById('copy-qr-link-btn');

    if (openQrBtn && qrModal) {
      openQrBtn.addEventListener('click', () => {
        qrModal.classList.remove('hidden');
      });
    }

    if (closeQrBtn && qrModal) {
      closeQrBtn.addEventListener('click', () => {
        qrModal.classList.add('hidden');
      });
    }

    if (qrModal) {
      qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) {
          qrModal.classList.add('hidden');
        }
      });
    }

    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('https://aqy31.github.io/Cuneiform-/').then(() => {
          copyLinkBtn.innerHTML = '<span>✅ تم نسخ الرابط بنجاح!</span>';
          setTimeout(() => {
            copyLinkBtn.innerHTML = '<span>📋 نسخ الرابط المباشر</span>';
          }, 2500);
        });
      });
    }
  }

  updateDomeHandle(azimuth, elevation) {
    const dome = document.getElementById('virtual-dome');
    const handle = document.getElementById('dome-sun-handle');
    if (!dome || !handle) return;

    const r = dome.clientWidth / 2;
    const dist = ((90 - elevation) / 85) * (r - 12);
    const theta = (azimuth * Math.PI) / 180;

    const x = r + dist * Math.sin(theta);
    const y = r - dist * Math.cos(theta);

    handle.style.left = `${x}px`;
    handle.style.top = `${y}px`;

    const badge = document.getElementById('light-angle-badge');
    if (badge) badge.innerText = `${azimuth}° / ${elevation}°`;
  }

  updateSlidersFromLighting() {
    const l = this.viewer.lighting;
    const elSlider = document.getElementById('elevation-slider');
    if (elSlider) elSlider.value = l.elevation;
    document.getElementById('elevation-val').innerText = `${l.elevation}°`;

    const intSlider = document.getElementById('intensity-slider');
    if (intSlider) intSlider.value = l.intensity;
    document.getElementById('intensity-val').innerText = `${l.intensity.toFixed(1)}x`;

    const kelSlider = document.getElementById('kelvin-slider');
    if (kelSlider) kelSlider.value = l.colorTemp;
    document.getElementById('kelvin-val').innerText = `${l.colorTemp}K`;

    const shSlider = document.getElementById('shadow-slider');
    if (shSlider) shSlider.value = l.shadowDarkness;
    document.getElementById('shadow-val').innerText = `${Math.round(l.shadowDarkness * 100)}%`;
  }
}
