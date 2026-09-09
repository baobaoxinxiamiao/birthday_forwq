// ===== Three.js 3D 生日蛋糕（加载真实 glb 模型 + 程序化蜡烛火焰） =====
window.Cake3D = (function () {
  let renderer, scene, camera, cakeGroup;
  let flame, flameInner, glowSprite, candleLight;
  let blowing = false;
  let blowStart = 0;
  let container;

  function init(el) {
    if (renderer) return; // 只初始化一次
    container = el;

    const w = el.clientWidth || 400;
    const h = el.clientHeight || 500;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, w / h, 1, 2000);
    camera.position.set(0, 90, 520);
    camera.lookAt(0, 70, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // 光照（Lambert 材质需要较强环境光）
    scene.add(new THREE.AmbientLight(0xffffff, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(160, 340, 280);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffe0ec, 0.4);
    fill.position.set(-200, 120, -180);
    scene.add(fill);

    cakeGroup = new THREE.Group();
    cakeGroup.position.y = -25; // 蛋糕整体往下放一点
    scene.add(cakeGroup);

    loadCake();

    window.addEventListener("resize", onResize);
    animate();
  }

  // 加载蛋糕模型（base64 内嵌，避免 file:// 下 fetch 被 CORS 拦截）
  function loadCake() {
    const base64 = window.CAKE_GLB_BASE64;
    if (!base64) {
      console.error("缺少蛋糕模型数据（cake-data.js 未加载）");
      return;
    }

    // base64 → ArrayBuffer
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const loader = new THREE.GLTFLoader();
    loader.parse(
      bytes.buffer,
      "",
      (gltf) => {
        const model = gltf.scene;

        // 按包围盒缩放到目标高度
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const targetH = 160;
        const s = targetH / size.y;
        model.scale.setScalar(s);

        // 底部对齐 y=0
        model.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(model);
        model.position.y = -box2.min.y;

        cakeGroup.add(model);

        // 在蛋糕顶部中心加蜡烛
        model.updateMatrixWorld(true);
        const box3 = new THREE.Box3().setFromObject(model);
        const topY = box3.max.y;
        const cx = (box3.min.x + box3.max.x) / 2;
        const cz = (box3.min.z + box3.max.z) / 2;

        addCandle(cx, topY, cz);
      },
      (err) => console.error("模型解析失败", err)
    );
  }

  // 生成烛光光晕贴图
  function makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255, 214, 130, 1)");
    g.addColorStop(0.35, "rgba(255, 170, 70, 0.55)");
    g.addColorStop(1, "rgba(255, 150, 50, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  // 在蛋糕顶部加蜡烛 + 火焰 + 烛光
  function addCandle(cx, topY, cz) {
    const candleH = 50;

    // 蜡烛
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, candleH, 32),
      new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.4 })
    );
    candle.position.set(cx, topY + candleH / 2 - 8, cz);
    cakeGroup.add(candle);

    // 烛芯
    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a })
    );
    wick.position.set(cx, topY + candleH - 6, cz);
    cakeGroup.add(wick);

    // 火焰（泪滴形 LatheGeometry）
    const flameY = topY + candleH + 4;
    flame = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(6, 2),
          new THREE.Vector2(9, 10),
          new THREE.Vector2(7, 20),
          new THREE.Vector2(3, 28),
          new THREE.Vector2(0, 32),
        ],
        18
      ),
      new THREE.MeshBasicMaterial({ color: 0xff9f43 })
    );
    flame.position.set(cx, flameY, cz);
    cakeGroup.add(flame);

    // 内焰
    flameInner = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 2),
          new THREE.Vector2(3, 6),
          new THREE.Vector2(4, 14),
          new THREE.Vector2(2, 22),
          new THREE.Vector2(0, 24),
        ],
        14
      ),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    flameInner.position.set(cx, flameY + 2, cz);
    cakeGroup.add(flameInner);

    // 烛光光晕
    glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      })
    );
    glowSprite.scale.set(140, 140, 1);
    glowSprite.position.set(cx, flameY + 4, cz);
    cakeGroup.add(glowSprite);

    // 烛光点光源
    candleLight = new THREE.PointLight(0xff9f43, 2.2, 400, 2);
    candleLight.position.set(cx, flameY + 4, cz);
    cakeGroup.add(candleLight);

    // 数字蜡烛「20」（不点火，放在点火蜡烛前面）
    addNumberCandles(cx, topY, cz);
  }

  // 数字蜡烛（数字 2 和 0 的挤出造型）
  function addNumberCandles(cx, topY, cz) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff8fb0,
      roughness: 0.4,
    });
    const extrude = {
      depth: 10,
      bevelEnabled: false, // 数码管风格，棱角分明
    };

    // 数字 2（七段数码管风格，全直线无弧度）
    const shape2 = new THREE.Shape();
    shape2.moveTo(4, 0);
    shape2.lineTo(30, 0);
    shape2.lineTo(30, 6);
    shape2.lineTo(10, 6);
    shape2.lineTo(10, 15);
    shape2.lineTo(30, 15);
    shape2.lineTo(30, 36);
    shape2.lineTo(4, 36);
    shape2.lineTo(4, 30);
    shape2.lineTo(24, 30);
    shape2.lineTo(24, 21);
    shape2.lineTo(4, 21);
    shape2.closePath();

    const geo2 = new THREE.ExtrudeGeometry(shape2, extrude);
    geo2.center();
    const num2 = new THREE.Mesh(geo2, mat);
    num2.position.set(cx - 16, topY + 18, cz + 30);
    cakeGroup.add(num2);

    // 数字 0（数码管方框：外矩形 + 内矩形孔洞）
    const shape0 = new THREE.Shape();
    shape0.moveTo(4, 0);
    shape0.lineTo(26, 0);
    shape0.lineTo(26, 36);
    shape0.lineTo(4, 36);
    shape0.closePath();
    const hole0 = new THREE.Path();
    hole0.moveTo(10, 6);
    hole0.lineTo(20, 6);
    hole0.lineTo(20, 30);
    hole0.lineTo(10, 30);
    hole0.closePath();
    shape0.holes.push(hole0);

    const geo0 = new THREE.ExtrudeGeometry(shape0, extrude);
    geo0.center();
    const num0 = new THREE.Mesh(geo0, mat);
    num0.position.set(cx + 16, topY + 18, cz + 30);
    cakeGroup.add(num0);
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = Date.now();

    cakeGroup.rotation.y += 0.006;

    if (flame) {
      if (!blowing) {
        // 火焰跳动
        const s = 1 + Math.sin(t * 0.02) * 0.12;
        flame.scale.set(s, 1 + Math.sin(t * 0.017) * 0.16, s);
        flameInner.scale.set(s, 1 + Math.sin(t * 0.02) * 0.13, s);

        // 光晕呼吸
        const gs = 1 + Math.sin(t * 0.013) * 0.08;
        glowSprite.scale.set(140 * gs, 140 * gs, 1);

        // 烛光闪烁
        candleLight.intensity =
          2.2 + Math.sin(t * 0.01) * 0.4 + Math.random() * 0.15;
      } else {
        // 吹灭动画
        const p = Math.min((Date.now() - blowStart) / 650, 1);
        const s = 1 - p;
        flame.scale.set(s, s * 0.5, s);
        flameInner.scale.set(s, s * 0.5, s);
        glowSprite.scale.set(140 * s, 140 * s, 1);
        candleLight.intensity = 2.2 * (1 - p);
        if (p >= 1) {
          flame.visible = false;
          flameInner.visible = false;
          glowSprite.visible = false;
        }
      }
    }

    renderer.render(scene, camera);
  }

  function blowOut() {
    blowing = true;
    blowStart = Date.now();
  }

  function onResize() {
    if (!container || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  return { init, blowOut };
})();
