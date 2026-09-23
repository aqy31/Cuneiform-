/**
 * العدسة المكبرة المجهرية التفاعلية (Floating Epigraphic Magnifier Loupe)
 * تتيح فك الرموز والتجاويف المتناهية الصغر بتكبير بصري يصل إلى 5x مع تعزيز التباين
 */
export class MagnifierLoupe {
  constructor(containerElement, viewer) {
    this.container = containerElement;
    this.viewer = viewer;
    this.active = false;
    this.zoomLevel = 2.8;
    this.loupeRadius = 90; // نصف القطر بالبكسل

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    const loupeHTML = `
      <div id="magnifier-loupe" class="magnifier-loupe hidden">
        <canvas id="loupe-canvas" width="180" height="180"></canvas>
        <div class="loupe-rim">
          <div class="loupe-glare"></div>
          <span class="loupe-badge">2.8x</span>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', loupeHTML);
    this.loupeEl = document.getElementById('magnifier-loupe');
    this.canvas = document.getElementById('loupe-canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  setActive(active) {
    this.active = active;
    if (active) {
      this.loupeEl.classList.remove('hidden');
    } else {
      this.loupeEl.classList.add('hidden');
    }
  }

  setZoom(zoom) {
    this.zoomLevel = Math.max(1.5, Math.min(5.0, zoom));
    const badge = this.loupeEl.querySelector('.loupe-badge');
    if (badge) badge.innerText = `${this.zoomLevel.toFixed(1)}x`;
  }

  bindEvents() {
    const webglCanvas = this.viewer.renderer.domElement;

    webglCanvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const rect = webglCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.updateLoupePosition(e.clientX, e.clientY);
      this.renderMagnifiedRegion(x, y);
    });

    // عجلة الفأرة أثناء تفعيل العدسة لتغيير نسبة التكبير
    this.loupeEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      this.setZoom(this.zoomLevel + delta);
    }, { passive: false });
  }

  updateLoupePosition(clientX, clientY) {
    // إزاحة خفيفة عن مؤشر الفأرة كي لا تحجبه
    const offsetX = 25;
    const offsetY = 25;
    this.loupeEl.style.left = `${clientX + offsetX}px`;
    this.loupeEl.style.top = `${clientY + offsetY}px`;
  }

  renderMagnifiedRegion(x, y) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const srcCanvas = this.viewer.renderer.domElement;

    const srcW = (this.canvas.width / this.zoomLevel) * dpr;
    const srcH = (this.canvas.height / this.zoomLevel) * dpr;
    const srcX = (x * dpr) - (srcW / 2);
    const srcY = (y * dpr) - (srcH / 2);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // قص دائري
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, this.loupeRadius - 4, 0, Math.PI * 2);
    this.ctx.clip();

    this.ctx.drawImage(
      srcCanvas,
      Math.max(0, srcX), Math.max(0, srcY), srcW, srcH,
      0, 0, this.canvas.width, this.canvas.height
    );

    // شبكة قياس مجهرية بالمليمتر داخل العدسة (Micro-Reticle)
    this.drawReticle(this.ctx);

    this.ctx.restore();
  }

  drawReticle(ctx) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1;

    // خطوط التقاطع
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    // تدريجات دقيقة
    for (let r = 25; r < this.loupeRadius; r += 20) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
