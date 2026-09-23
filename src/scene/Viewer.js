import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TabletBuilder } from './TabletBuilder.js';
import { LightingSystem } from './LightingSystem.js';
import { cuneiformDatasets, clayMaterials } from '../data/cuneiformTexts.js';

export class Viewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.width = containerElement.clientWidth || window.innerWidth || 800;
    this.height = containerElement.clientHeight || window.innerHeight || 600;

    this.currentText = cuneiformDatasets[0];
    this.currentClay = clayMaterials[0];
    this.isDepthMode = false;
    this.customModel = null;

    // حالة التحريك (Camera / Tablet animation)
    this.animating = false;
    this.animStartTime = 0;
    this.animDuration = 900;
    this.animStartCamPos = new THREE.Vector3();
    this.animEndCamPos = new THREE.Vector3();
    this.animStartTarget = new THREE.Vector3();
    this.animEndTarget = new THREE.Vector3();
    this.animStartRot = new THREE.Euler();
    this.animEndRot = new THREE.Euler();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initSystems();
    this.initEvents();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0d10);
    this.scene.fog = new THREE.FogExp2(0x0c0d10, 0.05);

    // أرضية خافتة تلتقط الظلال
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.ShadowMaterial({
      opacity: 0.55
    });
    this.shadowPlane = new THREE.Mesh(floorGeo, floorMat);
    this.shadowPlane.position.z = -0.7;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    this.tabletPivot = new THREE.Group();
    this.scene.add(this.tabletPivot);
  }

  initCamera() {
    const aspect = (this.width && this.height) ? (this.width / this.height) : (window.innerWidth / window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 7.8);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 18;
    this.controls.maxPolarAngle = Math.PI - 0.05;
    this.controls.minPolarAngle = 0.05;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 1.1;
  }

  initSystems() {
    this.lighting = new LightingSystem(this.scene, this.camera);
    this.builder = new TabletBuilder();
    this.loadTablet(this.currentText, this.currentClay);
  }

  loadTablet(textData, clayConfig) {
    this.currentText = textData;
    this.currentClay = clayConfig;

    while (this.tabletPivot.children.length > 0) {
      const child = this.tabletPivot.children[0];
      this.tabletPivot.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    this.tabletMesh = this.builder.createTablet(textData, clayConfig);
    this.tabletPivot.add(this.tabletMesh);
    this.tabletPivot.rotation.set(0, 0, 0);

    if (this.isDepthMode) {
      this.setDepthAnalysisMode(true);
    }

    if (this.onModelLoaded) {
      this.onModelLoaded(this.tabletMesh);
    }
  }

  initEvents() {
    const handleResize = () => {
      this.width = this.container.clientWidth || window.innerWidth;
      this.height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    };

    window.addEventListener('resize', handleResize);
    // استدعاء فوري لضمان دقة الأبعاد
    setTimeout(handleResize, 100);

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.lighting && this.lighting.isTorchMode && this.tabletMesh) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObject(this.tabletMesh, true);
        if (intersects.length > 0) {
          this.lighting.updateTorchPosition(intersects[0].point);
        }
      }
    });

    // سحب وإفلات النماذج
    const dropArea = window;
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.container.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.container.classList.remove('drag-active');
      }, false);
    });

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.loadCustomFile(files[0]);
      }
    });
  }

  /**
   * تحميل ملف GLB من رابط (مثل مجلد models/)
   */
  loadGLBFromUrl(url) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      this.setupCustomMesh(gltf.scene);
    }, undefined, (error) => {
      console.warn('Failed to load GLB from URL:', url, error);
    });
  }

  loadCustomFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (ext === 'glb' || ext === 'gltf') {
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        const loader = new GLTFLoader();
        loader.parse(e.target.result, '', (gltf) => {
          this.setupCustomMesh(gltf.scene);
        }, (err) => console.error('Error parsing GLTF/GLB:', err));
      };
    } else if (ext === 'obj') {
      reader.readAsText(file);
      reader.onload = (e) => {
        const loader = new OBJLoader();
        const obj = loader.parse(e.target.result);
        this.setupCustomMesh(obj);
      };
    }
  }

  setupCustomMesh(object3D) {
    while (this.tabletPivot.children.length > 0) {
      this.tabletPivot.remove(this.tabletPivot.children[0]);
    }

    const bbox = new THREE.Box3().setFromObject(object3D);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 4.5 / maxDim;
    object3D.scale.set(scale, scale, scale);
    object3D.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    object3D.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // ضمان تفعيل الخامة المناسبة
        if (child.material) {
          child.material.roughness = child.material.roughness || 0.8;
          child.material.needsUpdate = true;
        }
      }
    });

    this.tabletPivot.add(object3D);
    this.tabletMesh = object3D;
    this.resetCameraView();

    if (this.onModelLoaded) {
      this.onModelLoaded(this.tabletMesh);
    }
  }

  flipTabletTo(side = 'toggle') {
    let targetRotY = this.tabletPivot.rotation.y;
    let targetRotX = 0;

    if (side === 'toggle') {
      targetRotY = Math.abs(this.tabletPivot.rotation.y) < 1.0 ? Math.PI : 0;
    } else if (side === 'obverse') {
      targetRotY = 0;
      targetRotX = 0;
    } else if (side === 'reverse') {
      targetRotY = Math.PI;
      targetRotX = 0;
    } else if (side === 'upperEdge') {
      targetRotX = Math.PI / 2;
    } else if (side === 'lowerEdge') {
      targetRotX = -Math.PI / 2;
    }

    this.startTransition({
      tabletRot: new THREE.Euler(targetRotX, targetRotY, 0),
      camPos: new THREE.Vector3(0, 0, 7.5),
      camTarget: new THREE.Vector3(0, 0, 0),
      duration: 1000
    });
  }

  focusOnLine(lineIndex) {
    if (!this.builder.lineHotspots[lineIndex]) return;
    const hotspot = this.builder.lineHotspots[lineIndex];

    const target = hotspot.position.clone();
    target.applyEuler(this.tabletPivot.rotation);

    const camPos = target.clone().add(new THREE.Vector3(0, 0, 3.8));

    this.startTransition({
      camPos: camPos,
      camTarget: target,
      duration: 800
    });
  }

  resetCameraView() {
    this.startTransition({
      camPos: new THREE.Vector3(0, 0, 7.8),
      camTarget: new THREE.Vector3(0, 0, 0),
      duration: 800
    });
  }

  startTransition({ camPos, camTarget, tabletRot, duration = 800 }) {
    this.animating = true;
    this.animStartTime = performance.now();
    this.animDuration = duration;

    this.animStartCamPos.copy(this.camera.position);
    this.animEndCamPos.copy(camPos || this.camera.position);

    this.animStartTarget.copy(this.controls.target);
    this.animEndTarget.copy(camTarget || this.controls.target);

    this.animStartRot.copy(this.tabletPivot.rotation);
    this.animEndRot.copy(tabletRot || this.tabletPivot.rotation);
  }

  /**
   * وضع التقريب الفائق (Super Macro Mode) لفحص ضربات القلم المجهرية
   */
  toggleSuperMacro(enable) {
    if (enable) {
      this.controls.minDistance = 0.8;
      this.startTransition({
        camPos: new THREE.Vector3(0, 0, 2.2),
        camTarget: new THREE.Vector3(0, 0, 0),
        duration: 900
      });
    } else {
      this.controls.minDistance = 2.0;
      this.resetCameraView();
    }
  }

  /**
   * نمط الرسم الخطي الأكاديمي بالأبيض والأسود (Binarized High-Contrast Mode)
   */
  setBinarizationMode(enabled) {
    this.isBinarized = enabled;
    if (!this.tabletMesh) return;

    if (enabled) {
      const binarizedMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        roughness: 0.95,
        metalness: 0.0,
        normalMap: this.builder.textures.normal,
        normalScale: new THREE.Vector2(3.5, 3.5),
        aoMap: this.builder.textures.ao,
        aoMapIntensity: 2.5
      });
      this.tabletMesh.material = binarizedMat;
    } else {
      if (this.isDepthMode) {
        this.setDepthAnalysisMode(true);
      } else {
        this.builder.updateClayMaterial(this.currentClay);
      }
    }
  }

  setDepthAnalysisMode(enabled) {
    this.isDepthMode = enabled;
    if (!this.tabletMesh) return;

    if (enabled) {
      if (!this.normalMaterial) {
        this.normalMaterial = new THREE.MeshNormalMaterial({
          normalMap: this.builder.textures.normal,
          normalScale: new THREE.Vector2(2.5, 2.5)
        });
      }
      this.tabletMesh.material = this.normalMaterial;
    } else {
      this.builder.updateClayMaterial(this.currentClay);
    }
  }

  takeSnapshot() {
    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);

    this.renderer.setSize(originalSize.x * 2, originalSize.y * 2, false);
    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');

    this.renderer.setSize(originalSize.x, originalSize.y, false);

    const link = document.createElement('a');
    link.download = `Cuneiform_RTI_Tablet_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    if (this.animating) {
      const elapsed = time - this.animStartTime;
      const progress = Math.min(1.0, elapsed / this.animDuration);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(this.animStartCamPos, this.animEndCamPos, ease);
      this.controls.target.lerpVectors(this.animStartTarget, this.animEndTarget, ease);

      this.tabletPivot.rotation.x = THREE.MathUtils.lerp(this.animStartRot.x, this.animEndRot.x, ease);
      this.tabletPivot.rotation.y = THREE.MathUtils.lerp(this.animStartRot.y, this.animEndRot.y, ease);
      this.tabletPivot.rotation.z = THREE.MathUtils.lerp(this.animStartRot.z, this.animEndRot.z, ease);

      if (progress >= 1.0) {
        this.animating = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
