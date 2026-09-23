import { cuneiformSignsDictionary } from '../data/cuneiformSignsDictionary.js';

export class SignDictionaryModal {
  constructor(drawingToolbar) {
    this.drawingToolbar = drawingToolbar;
    this.signs = cuneiformSignsDictionary;
    this.filteredSigns = [...this.signs];

    this.initDOM();
    this.bindEvents();
    this.renderSigns();
  }

  initDOM() {
    const modalHTML = `
      <div id="sign-dictionary-backdrop" class="reader-backdrop hidden">
        <div class="reader-modal-container theme-dark dict-modal-container">
          <!-- الرأس -->
          <header class="reader-header">
            <div class="reader-title-group">
              <span class="ancient-badge">📖 الدليل الأثري لمعجم الرموز المسمارية</span>
              <h2>معجم الرموز والعلامات المسمارية (Borger & Labat Catalog)</h2>
              <p class="reader-subtitle">مرجع أكاديمي لقراءة وتفكيك أوتاد العلامات السومرية والأكدية القديمة</p>
            </div>
            <button id="close-dictionary-btn" class="close-btn" title="إغلاق المعجم">✕</button>
          </header>

          <!-- شريط البحث السريع -->
          <div class="dict-search-bar">
            <input type="text" id="dict-search-input" placeholder="🔍 ابحث باسم الرمز، القراءة الأكدية، أو المعنى العربي (مثال: ملك، آنو، بيت، AN، LUGAL)..." />
          </div>

          <!-- قائمة بطاقات الرموز المسمارية -->
          <div id="dict-signs-grid" class="dict-cards-grid">
            <!-- سيتم توليد البطاقات ديناميكياً -->
          </div>

          <footer class="reader-footer">
            <span class="reader-tip">💡 اضغط على زر (✍️ ابدأ رسم هذا الرمز) لفتح أداة الشف والرسم الحر والأوتاد المسمارية لتطبيقه عملياً!</span>
          </footer>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.backdrop = document.getElementById('sign-dictionary-backdrop');
    this.gridEl = document.getElementById('dict-signs-grid');
    this.searchInput = document.getElementById('dict-search-input');
  }

  open() {
    this.backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.searchInput.focus();
  }

  close() {
    this.backdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }

  bindEvents() {
    document.getElementById('close-dictionary-btn').addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    this.searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        this.filteredSigns = [...this.signs];
      } else {
        this.filteredSigns = this.signs.filter(s => 
          s.sign.includes(q) ||
          s.sumerian.toLowerCase().includes(q) ||
          s.akkadian.toLowerCase().includes(q) ||
          s.arabicName.toLowerCase().includes(q) ||
          s.meaningArabic.toLowerCase().includes(q)
        );
      }
      this.renderSigns();
    });
  }

  renderSigns() {
    if (this.filteredSigns.length === 0) {
      this.gridEl.innerHTML = `<div class="empty-results">لم يتم العثور على رموز مسمارية مطابقة للبحث.</div>`;
      return;
    }

    this.gridEl.innerHTML = this.filteredSigns.map(sign => `
      <article class="sign-card">
        <div class="sign-card-top">
          <div class="glyph-avatar">${sign.sign}</div>
          <div class="sign-names">
            <div class="sign-codes">
              <span class="code-tag">Borger #${sign.borger}</span>
              <span class="code-tag">Labat #${sign.labat}</span>
            </div>
            <h3 class="sign-arabic-title">${sign.arabicName}</h3>
            <p class="sign-phonetics">${sign.sumerian} • ${sign.akkadian}</p>
          </div>
        </div>

        <div class="sign-card-body">
          <div class="sign-info-row">
            <span class="info-label">المعنى الدلالي:</span>
            <p class="info-desc">${sign.meaningArabic}</p>
          </div>

          <div class="sign-info-row">
            <span class="info-label">الأصل الصوري السومري:</span>
            <p class="info-desc sub">${sign.periodOrigin}</p>
          </div>

          <div class="wedge-anatomy-box">
            <span class="info-label">تشريح الأوتاد:</span>
            <div class="wedge-counts">
              <span>أفقي: <b>${sign.wedgeAnatomy.horizontal}</b></span>
              <span>عمودي: <b>${sign.wedgeAnatomy.vertical}</b></span>
              <span>وينكلهوكن: <b>${sign.wedgeAnatomy.winkelhaken}</b></span>
            </div>
            <p class="anatomy-text">${sign.wedgeAnatomy.description}</p>
          </div>
        </div>

        <div class="sign-card-footer">
          <button class="trace-sign-btn" data-sign="${sign.sign}" title="فتح لوحة الرسم للتدرب على رسم هذا الرمز">
            ✍️ ابدأ رسم هذا الرمز
          </button>
        </div>
      </article>
    `).join('');

    // ربط زر بدء الرسم
    this.gridEl.querySelectorAll('.trace-sign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.close();
        if (this.drawingToolbar) {
          this.drawingToolbar.open();
        }
      });
    });
  }
}
