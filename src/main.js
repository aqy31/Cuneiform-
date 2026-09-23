import './style.css';
import { Viewer } from './scene/Viewer.js';
import { ReaderModal } from './ui/ReaderModal.js';
import { ControlsPanel } from './ui/ControlsPanel.js';
import { MeshSurfacePainter } from './scene/MeshSurfacePainter.js';
import { DrawingToolbar } from './ui/DrawingToolbar.js';
import { MagnifierLoupe } from './scene/MagnifierLoupe.js';
import { SignDictionaryModal } from './ui/SignDictionaryModal.js';

function startApp() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  try {
    // 1. تهيئة مشهد الفحص المسماري ثلاثي الأبعاد
    const viewer = new Viewer(container);

    // 2. تهيئة محرك الرسم المباشر على أسطح المجسمات ثلاثية الأبعاد (Texture & Mesh Inking)
    const meshSurfacePainter = new MeshSurfacePainter(viewer);

    // 3. تهيئة شريط أدوات الرسم وتصدير SVG/PNG
    const drawingToolbar = new DrawingToolbar(meshSurfacePainter, viewer);

    // مستشعر أبعاد وهيكل المجسم التلقائي: عند تحميل أي لوح أو استيراد أي ملف GLB خارجي
    viewer.onModelLoaded = (mesh) => {
      const dimensions = meshSurfacePainter.attachToModel(mesh);
      drawingToolbar.updateDimensionsBadge(dimensions);
      console.log('📐 تم حساب أبعاد المجسم وتجهيز طبقة الرسم ثلاثية الأبعاد:', dimensions);
    };

    // ربط فوري للوح الحالي
    if (viewer.tabletMesh) {
      viewer.onModelLoaded(viewer.tabletMesh);
    }

    // 4. تهيئة نافذة القراءة المريحة وترجمة النصوص المسمارية
    const readerModal = new ReaderModal(viewer);

    // 5. تهيئة العدسة المكبرة التفاعلية
    const magnifierLoupe = new MagnifierLoupe(document.getElementById('app'), viewer);

    // 6. تهيئة معجم العلامات المسمارية
    const signDictionaryModal = new SignDictionaryModal(drawingToolbar);

    // 7. تهيئة لوحة التحكم بالأشعة والإضاءة والشيدر والقبة التفاعلية
    const controlsPanel = new ControlsPanel(
      viewer,
      readerModal,
      drawingToolbar,
      magnifierLoupe,
      signDictionaryModal
    );

    console.log('🏛️ Cuneiform RTI 3D Studio & 3D Surface Inking Initialized Successfully!');
  } catch (err) {
    console.error('Fatal initialization error:', err);
    const errorBox = document.createElement('div');
    errorBox.style.position = 'fixed';
    errorBox.style.top = '20px';
    errorBox.style.left = '50%';
    errorBox.style.transform = 'translateX(-50%)';
    errorBox.style.background = '#e11d48';
    errorBox.style.color = '#fff';
    errorBox.style.padding = '12px 24px';
    errorBox.style.borderRadius = '8px';
    errorBox.style.zIndex = '99999';
    errorBox.style.fontSize = '14px';
    errorBox.style.direction = 'rtl';
    errorBox.innerHTML = `⚠️ تنبيه: ${err.message}`;
    document.body.appendChild(errorBox);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
