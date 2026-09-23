import { cuneiformDatasets } from '../data/cuneiformTexts.js';

export class ReaderModal {
  constructor(viewer) {
    this.viewer = viewer;
    this.currentDataset = cuneiformDatasets[0];
    this.currentTheme = 'dark';
    this.fontSize = 18;
    this.isPlayingAmbient = false;
    this.audioContext = null;
    this.activeNodes = [];

    this.initDOM();
    this.bindEvents();
    this.renderDataset(this.currentDataset);
  }

  initDOM() {
    // بناء هيكل القارئ التفاعلي المريح
    const modalHTML = `
      <div id="cuneiform-reader-backdrop" class="reader-backdrop hidden">
        <div class="reader-modal-container theme-dark">
          <!-- الرأس العلوي للقارئ -->
          <header class="reader-header">
            <div class="reader-title-group">
              <span class="ancient-badge">📜 استعراض وفك شفرة النصوص الأثرية</span>
              <h2 id="reader-tablet-title">ملحمة جلجامش - اللوح الحادي عشر</h2>
              <p id="reader-tablet-meta" class="reader-subtitle">المتحف البريطاني K.3375 • العصر البابلي الحديث</p>
            </div>
            
            <div class="reader-actions-group">
              <!-- أزرار تكبير وتصغير الخط للقراءة المريحة -->
              <div class="font-size-controls" title="حجم الخط">
                <button id="font-decrease-btn" class="reader-icon-btn">A-</button>
                <span id="font-size-display">18px</span>
                <button id="font-increase-btn" class="reader-icon-btn">A+</button>
              </div>

              <!-- تبديل ثيمات القراءة المريحة للعينين -->
              <div class="theme-controls">
                <button class="theme-btn active" data-theme="dark" title="فحم ليلي مريح للعينين">🌙</button>
                <button class="theme-btn" data-theme="parchment" title="ورق بردي أثري دافئ">📜</button>
                <button class="theme-btn" data-theme="clay" title="طين سومري تقليدي">🏺</button>
              </div>

              <!-- مؤشر الموسيقى الأثرية الغامرة المحاكاة -->
              <button id="ambient-audio-btn" class="reader-action-btn" title="تشغيل صوت بيئة تنقيب وقيثارة سومرية محاكاة">
                <span class="icon">🎵</span>
                <span class="label">أجواء أثرية</span>
              </button>

              <!-- زر قلب اللوح من القارئ مباشرة -->
              <button id="reader-flip-tablet-btn" class="reader-action-btn highlight" title="قلب اللوح 180° لمعاينة الوجه الآخر">
                <span class="icon">🔃</span>
                <span class="label">قلب اللوح</span>
              </button>

              <!-- زر الإغلاق -->
              <button id="close-reader-btn" class="close-btn" title="إغلاق القارئ">✕</button>
            </div>
          </header>

          <!-- شريط اختيار اللوح المسماري -->
          <nav class="reader-tablet-selector">
            ${cuneiformDatasets.map((ds, idx) => `
              <button class="tablet-select-tab ${idx === 0 ? 'active' : ''}" data-id="${ds.id}">
                ${ds.title}
              </button>
            `).join('')}
          </nav>

          <!-- مقدمة تاريخية عن اللوح -->
          <div class="tablet-overview-card">
            <p id="reader-tablet-desc">${this.currentDataset.description}</p>
          </div>

          <!-- قائمة السطور التفاعلية المقسمة للدراسة -->
          <div id="cuneiform-lines-scroll" class="reader-lines-container">
            <!-- سيتم توليد السطور ديناميكياً هنا -->
          </div>

          <!-- شريط معلومات القراءة السفلي -->
          <footer class="reader-footer">
            <span class="reader-tip">💡 اضغط على أيقونة (🎯 ركز في اللوح) بجانب السطر لتوجيه الكاميرا ثلاثية الأبعاد إليه مباشرة في المجسم!</span>
            <div class="reader-footer-actions">
              <button id="copy-all-text-btn" class="reader-text-link">📋 نسخ الترجمة كاملة</button>
            </div>
          </footer>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    this.backdrop = document.getElementById('cuneiform-reader-backdrop');
    this.container = this.backdrop.querySelector('.reader-modal-container');
    this.linesContainer = document.getElementById('cuneiform-lines-scroll');
  }

  bindEvents() {
    // إغلاق النافذة
    document.getElementById('close-reader-btn').addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    // زر قلب اللوح
    document.getElementById('reader-flip-tablet-btn').addEventListener('click', () => {
      this.viewer.flipTabletTo('toggle');
    });

    // التنقل بين الألواح
    this.container.querySelectorAll('.tablet-select-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const ds = cuneiformDatasets.find(d => d.id === id);
        if (ds) {
          this.container.querySelectorAll('.tablet-select-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentDataset = ds;
          this.renderDataset(ds);
          this.viewer.selectTextDataset(ds);
        }
      });
    });

    // التحكم في حجم الخط
    document.getElementById('font-increase-btn').addEventListener('click', () => {
      if (this.fontSize < 28) {
        this.fontSize += 2;
        this.updateFontSize();
      }
    });

    document.getElementById('font-decrease-btn').addEventListener('click', () => {
      if (this.fontSize > 14) {
        this.fontSize -= 2;
        this.updateFontSize();
      }
    });

    // تبديل الثيم المريح للقراءة
    this.container.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        this.container.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setTheme(theme);
      });
    });

    // نسخ الترجمة كاملة
    document.getElementById('copy-all-text-btn').addEventListener('click', () => {
      const fullText = this.currentDataset.lines.map(l => 
        `السطر ${l.num}:\n[المسماري]: ${l.cuneiform}\n[الأكدي/السومري]: ${l.transliteration}\n[العربية]: ${l.arabic}\n[English]: ${l.english}\n`
      ).join('\n---\n\n');
      
      navigator.clipboard.writeText(fullText).then(() => {
        const btn = document.getElementById('copy-all-text-btn');
        btn.innerText = '✅ تم نسخ النص بنجاح!';
        setTimeout(() => { btn.innerText = '📋 نسخ الترجمة كاملة'; }, 2500);
      });
    });

    // تشغيل الأجواء الصوتية الأثرية (Web Audio Synth)
    document.getElementById('ambient-audio-btn').addEventListener('click', () => {
      this.toggleAmbientSound();
    });
  }

  open() {
    this.backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const mobBtn = document.getElementById('mob-reader-btn');
    if (mobBtn) mobBtn.classList.add('active');
    const headerBtn = document.getElementById('open-reader-btn');
    if (headerBtn) headerBtn.classList.add('active');
  }

  close() {
    this.backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    const mobBtn = document.getElementById('mob-reader-btn');
    if (mobBtn) mobBtn.classList.remove('active');
    const headerBtn = document.getElementById('open-reader-btn');
    if (headerBtn) headerBtn.classList.remove('active');
  }

  renderDataset(ds) {
    document.getElementById('reader-tablet-title').innerText = ds.title;
    document.getElementById('reader-tablet-meta').innerText = `${ds.museumId} • ${ds.period} • ${ds.date}`;
    document.getElementById('reader-tablet-desc').innerText = ds.description;

    this.linesContainer.innerHTML = ds.lines.map((line, idx) => `
      <article class="cuneiform-line-card" data-line-index="${idx}">
        <div class="line-header">
          <span class="line-badge">السطر ${line.num}</span>
          <button class="focus-line-btn" data-index="${idx}" title="تركيز الكاميرا ثلاثية الأبعاد على هذا السطر في اللوح">
            🎯 ركز في اللوح
          </button>
        </div>

        <!-- النص المسماري الأصلي -->
        <div class="line-section cuneiform-script-box">
          <span class="section-label">النص المسماري الأصلي:</span>
          <p class="cuneiform-glyphs" dir="ltr">${line.cuneiform}</p>
        </div>

        <!-- النقح الصوتي الأكدي/السومري -->
        <div class="line-section transliteration-box">
          <span class="section-label">النقح الصوتي (Transliteration):</span>
          <p class="transliteration-text" dir="ltr">${line.transliteration}</p>
        </div>

        <!-- الترجمة العربية الفصيحة -->
        <div class="line-section arabic-translation-box">
          <span class="section-label">الترجمة العربية الفصيحة:</span>
          <p class="arabic-text">${line.arabic}</p>
        </div>

        <!-- الترجمة الإنجليزية الأكاديمية -->
        <div class="line-section english-translation-box">
          <span class="section-label">English Translation:</span>
          <p class="english-text" dir="ltr">${line.english}</p>
        </div>

        <!-- الهوامش والشروحات الأثرية -->
        ${line.notes ? `
          <div class="line-section notes-box">
            <span class="notes-icon">📌</span>
            <span class="notes-text">${line.notes}</span>
          </div>
        ` : ''}
      </article>
    `).join('');

    // ربط أزرار التركيز على السطور
    this.linesContainer.querySelectorAll('.focus-line-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        this.viewer.focusOnLine(idx);
        this.close(); // إغلاق القارئ لمعاينة اللوح في المشهد
      });
    });

    this.updateFontSize();
  }

  updateFontSize() {
    document.getElementById('font-size-display').innerText = `${this.fontSize}px`;
    const arabicTexts = this.linesContainer.querySelectorAll('.arabic-text');
    arabicTexts.forEach(el => el.style.fontSize = `${this.fontSize}px`);

    const cuneiformGlyphs = this.linesContainer.querySelectorAll('.cuneiform-glyphs');
    cuneiformGlyphs.forEach(el => el.style.fontSize = `${this.fontSize * 1.35}px`);

    const transliterationTexts = this.linesContainer.querySelectorAll('.transliteration-text');
    transliterationTexts.forEach(el => el.style.fontSize = `${this.fontSize * 0.95}px`);
  }

  setTheme(themeName) {
    this.currentTheme = themeName;
    this.container.classList.remove('theme-dark', 'theme-parchment', 'theme-clay');
    this.container.classList.add(`theme-${themeName}`);
  }

  /**
   * محاكاة صوتية بيئية حية (Web Audio API Harp & Desert Ambience)
   * صوت قيثارة سومرية أثرية ترددية ومؤثرات خرير هواء هادئ بدون الحاجة لأي ملف خارجي
   */
  toggleAmbientSound() {
    const btn = document.getElementById('ambient-audio-btn');

    if (this.isPlayingAmbient) {
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      this.isPlayingAmbient = false;
      btn.classList.remove('active');
      btn.querySelector('.label').innerText = 'أجواء أثرية';
      return;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();

      // نغمات السلم السومري البابلي القديم (Silver Lyre of Ur scale)
      const scaleFrequencies = [220, 247.5, 275, 330, 371.25, 440, 495]; // هرتز
      let noteIndex = 0;

      // مولد هواء الصحراء الخافت
      const bufferSize = this.audioContext.sampleRate * 2;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.015;
      }

      const whiteNoise = this.audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;

      whiteNoise.connect(filter);
      filter.connect(this.audioContext.destination);
      whiteNoise.start();

      // دالة عزف نغمة قيثارة ناعمة بتكرار متقطع
      const playLyrePluck = () => {
        if (!this.isPlayingAmbient || !this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        const freq = scaleFrequencies[Math.floor(Math.random() * scaleFrequencies.length)];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

        gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 3.2);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 3.3);

        const nextDelay = 1800 + Math.random() * 2500;
        this.ambientTimeout = setTimeout(playLyrePluck, nextDelay);
      };

      this.isPlayingAmbient = true;
      btn.classList.add('active');
      btn.querySelector('.label').innerText = 'إيقاف الأجواء';
      playLyrePluck();

    } catch (e) {
      console.warn('Audio Context is not permitted', e);
    }
  }
}
