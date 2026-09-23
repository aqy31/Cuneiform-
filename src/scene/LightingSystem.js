import * as THREE from 'three';

/**
 * نظام الإضاءة الأثري RTI والضوء المائل الكاشف (Raking Light Studio)
 */
export class LightingSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // إعدادات الإضاءة الافتراضية (وضع الضوء المائل الكاشف Raking Light 22°)
    this.azimuth = 135;       // زاوية الدوران الأفقية
    this.elevation = 22;      // زاوية الارتفاع الرأسية المنخفضة لإظهار الظلال
    this.intensity = 2.8;     // شدة الإضاءة
    this.colorTemp = 3800;    // حرارة اللون (كلفن)
    this.shadowDarkness = 0.85;
    this.distance = 6.5;

    this.isTorchMode = false;
    this.isDepthMode = false;

    // تهيئة المؤشرات والمصادر بالترتيب الصحيح
    this.initHelpers();
    this.initLights();
  }

  /**
   * مؤشرات بصرية في المشهد لموقع الضوء وحركته
   */
  initHelpers() {
    // كرة مضيئة في الفضاء ثلاثي الأبعاد تمثل الشمس/المصباح
    const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffe082,
      wireframe: false
    });
    this.sunSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.scene.add(this.sunSphere);

    // شعاع ضوئي رفيع يربط بين مصدر الضوء ومركز اللوح
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xd4af37,
      dashSize: 0.2,
      gapSize: 0.1,
      opacity: 0.4,
      transparent: true
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    this.rayGuide = new THREE.Line(lineGeo, lineMat);
    this.scene.add(this.rayGuide);
  }

  /**
   * تهيئة مصادر الضوء والظلال
   */
  initLights() {
    // 1. الضوء الكاشف الرئيسي الموجه (Directional Raking Light)
    this.dirLight = new THREE.DirectionalLight(0xfff4e6, this.intensity);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 16;
    this.dirLight.shadow.camera.left = -4;
    this.dirLight.shadow.camera.right = 4;
    this.dirLight.shadow.camera.top = 4;
    this.dirLight.shadow.camera.bottom = -4;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.normalBias = 0.025;
    this.dirLight.shadow.radius = 1.8; // ظلال ناعمة واقعية (PCF Soft)
    this.scene.add(this.dirLight);

    // الهدف الذي يركز عليه الضوء
    this.lightTarget = new THREE.Object3D();
    this.lightTarget.position.set(0, 0, 0);
    this.scene.add(this.lightTarget);
    this.dirLight.target = this.lightTarget;

    // 2. الضوء المحيطي التكميلي (Ambient / Fill Light)
    this.ambientLight = new THREE.AmbientLight(0x221a14, 0.45);
    this.scene.add(this.ambientLight);

    // 3. ضوء استوديو ناعم من الخلف (Rim Light) لإبراز حواف اللوح ثلاثي الأبعاد
    this.rimLight = new THREE.DirectionalLight(0xa6b8c7, 0.6);
    this.rimLight.position.set(0, 3, -5);
    this.scene.add(this.rimLight);

    // 4. مصباح التنقيب التفاعلي (Interactive Torchlight)
    this.torchLight = new THREE.PointLight(0xffa238, 0, 8, 1.8);
    this.torchLight.castShadow = false;
    this.torchLight.position.set(0, 0, 2);
    this.scene.add(this.torchLight);

    // تحديث الموقع الأولي للضوء واللون
    this.updateLightPosition();
    this.updateLightColor();
  }

  /**
   * حساب الإحداثيات الكروية للضوء بناء على السمت (Azimuth) والارتفاع (Elevation)
   */
  updateLightPosition() {
    const theta = (this.azimuth * Math.PI) / 180;
    const phi = ((90 - this.elevation) * Math.PI) / 180;

    const x = this.distance * Math.sin(phi) * Math.sin(theta);
    const y = this.distance * Math.cos(phi);
    const z = this.distance * Math.sin(phi) * Math.cos(theta);

    if (this.dirLight) {
      this.dirLight.position.set(x, y, z);
    }
    if (this.sunSphere) {
      this.sunSphere.position.set(x, y, z);
    }

    // تحديث شعاع الدليل بأمان
    if (this.rayGuide && this.rayGuide.geometry && this.rayGuide.geometry.attributes.position) {
      const posAttr = this.rayGuide.geometry.attributes.position;
      posAttr.setXYZ(0, x, y, z);
      posAttr.setXYZ(1, 0, 0, 0);
      posAttr.needsUpdate = true;
      this.rayGuide.computeLineDistances();
    }
  }

  /**
   * تحديث زاوية الضوء من الواجهة (القبة الافتراضية)
   */
  setDirection(azimuth, elevation) {
    this.azimuth = azimuth;
    this.elevation = Math.max(5, Math.min(88, elevation));
    this.updateLightPosition();
  }

  /**
   * شدة الضوء الرئيسي والمحيطي
   */
  setIntensity(val) {
    this.intensity = val;
    if (this.dirLight) {
      this.dirLight.intensity = val;
    }
  }

  /**
   * تحكم بظلمة وتأثير الظلال (Shadow Darkness)
   */
  setShadowDarkness(val) {
    this.shadowDarkness = val;
    if (this.ambientLight) {
      const ambientIntensity = (1.0 - val) * 0.9 + 0.08;
      this.ambientLight.intensity = ambientIntensity;
    }
  }

  /**
   * ضبط حرارة لون الضوء (Kelvin to RGB)
   */
  setColorTemperature(kelvin) {
    this.colorTemp = kelvin;
    this.updateLightColor();
  }

  updateLightColor() {
    const color = this.kelvinToRGB(this.colorTemp);
    if (this.dirLight) {
      this.dirLight.color.copy(color);
    }
    if (this.sunSphere && this.sunSphere.material) {
      this.sunSphere.material.color.copy(color);
    }
  }

  /**
   * خوارزمية دقيقة لتحويل حرارة اللون بالكلفن (Kelvin) إلى مركبات RGB
   */
  kelvinToRGB(kelvin) {
    const temp = kelvin / 100;
    let r, g, b;

    if (temp <= 66) {
      r = 255;
      g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
      if (temp <= 19) {
        b = 0;
      } else {
        b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
      }
    } else {
      r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
      b = 255;
    }

    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  /**
   * تفعيل أو تعطيل مصباح الفحص التفاعلي
   */
  setTorchMode(enabled) {
    this.isTorchMode = enabled;
    if (this.torchLight) {
      this.torchLight.intensity = enabled ? 3.5 : 0;
    }
  }

  /**
   * تحديث موقع المصباح التفاعلي مع حركة الفأرة
   */
  updateTorchPosition(intersectionPoint) {
    if (!this.isTorchMode || !intersectionPoint || !this.torchLight) return;
    this.torchLight.position.copy(intersectionPoint);
    this.torchLight.position.z += 0.8;
  }

  /**
   * إظهار أو إخفاء المؤشرات المساعدة في المشهد
   */
  setHelpersVisible(visible) {
    if (this.sunSphere) this.sunSphere.visible = visible;
    if (this.rayGuide) this.rayGuide.visible = visible;
  }

  /**
   * تطبيق إعداد مسبق (Preset)
   */
  applyPreset(preset) {
    if (preset.azimuth !== undefined) this.azimuth = preset.azimuth;
    if (preset.elevation !== undefined) this.elevation = preset.elevation;
    if (preset.intensity !== undefined) this.setIntensity(preset.intensity);
    if (preset.colorTemp !== undefined) this.setColorTemperature(preset.colorTemp);
    if (preset.shadowDarkness !== undefined) this.setShadowDarkness(preset.shadowDarkness);
    this.updateLightPosition();
  }
}
