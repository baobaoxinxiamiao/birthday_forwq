// ===== 视频碎裂 + 巨大烟花 =====
window.FinalEffect = (function () {
  const COLORS = [
    "#ffd93d", "#ff6b6b", "#ff9f43", "#ff77e9",
    "#6c5ce7", "#00d2ff", "#2ed573", "#ff4757",
  ];

  // 视频碎裂成方块掉落（纯视觉效果，用 Canvas 切块）
  function shatter(video, onDone) {
    const rect = video.getBoundingClientRect();
    const cw = Math.round(rect.width);
    const ch = Math.round(rect.height);
    if (cw <= 0 || ch <= 0) {
      onDone && onDone();
      return;
    }

    // 快照最后一帧（隐藏视频后仍能取到画面）
    const snap = document.createElement("canvas");
    snap.width = video.videoWidth || cw;
    snap.height = video.videoHeight || ch;
    snap.getContext("2d").drawImage(video, 0, 0, snap.width, snap.height);

    // 主 canvas：覆盖整个屏幕（横向到屏幕左右、纵向到屏幕底部），碎片飘散不被边框裁剪
    const fullW = window.innerWidth;
    const fullH = window.innerHeight - rect.top;
    const canvas = document.createElement("canvas");
    canvas.width = fullW;
    canvas.height = fullH;
    canvas.style.cssText =
      `position:fixed;left:0;top:${rect.top}px;width:${fullW}px;height:${fullH}px;z-index:3;pointer-events:none;`;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    video.style.visibility = "hidden";

    // 切成网格
    const cols = 12;
    const rows = 7;
    const vw = snap.width;
    const vh = snap.height;
    const pw = vw / cols;
    const ph = vh / rows;
    const dw = cw / cols;
    const dh = ch / rows;

    const pieces = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        pieces.push({
          sx: c * pw, sy: r * ph, sw: pw, sh: ph,
          x: rect.left + c * dw, y: r * dh, w: dw, h: dh,
          vx: (Math.random() - 0.5) * 16, // 明显左右飘散
          vy: 3, // 统一初速度，保持间距
          rot: 0,
          rotSpeed: (Math.random() - 0.5) * 0.15, // 掉落时随机轻微旋转
          delay: (rows - 1 - r) * 0.06, // 底部先掉，行间留足间隔
          alpha: 1,
        });
      }
    }

    const start = performance.now();
    function frame(now) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, fullW, fullH);

      let alive = false;
      for (const p of pieces) {
        if (t < p.delay) {
          // 还没开始掉，静止在原位
          ctx.drawImage(snap, p.sx, p.sy, p.sw, p.sh, p.x, p.y, p.w, p.h);
          alive = true;
          continue;
        }
        p.vy += 0.15; // 重力（减小，让碎片飘得更久，横向位移更明显）
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        // 完全移出底部后消失
        if (p.y - p.h > fullH) continue;

        // 接近屏幕底部时逐渐沉入黑暗，避免"地面"的硬边界
        let alpha = 1;
        const fadeStart = fullH * 0.72;
        if (p.y > fadeStart) {
          alpha = Math.max(0, 1 - (p.y - fadeStart) / (fullH - fadeStart));
        }

        alive = true;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.rot);
        ctx.drawImage(snap, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (alive) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
        onDone && onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  // 巨大烟花：中间一大发 + 左右各两小发，一起上天
  function bigFirework(cx, cy) {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = "position:fixed;inset:0;z-index:4;pointer-events:none;";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    const rockets = [
      { x: cx, y: cy, ty: cy - H * 0.34, speed: 11, big: true, color: "#ffe27a" },
      { x: cx - W * 0.13, y: cy, ty: cy - H * 0.26, speed: 9, big: false, color: "#ffd93d" },
      { x: cx - W * 0.25, y: cy, ty: cy - H * 0.20, speed: 8, big: false, color: "#ff9f43" },
      { x: cx + W * 0.13, y: cy, ty: cy - H * 0.26, speed: 9, big: false, color: "#ffd93d" },
      { x: cx + W * 0.25, y: cy, ty: cy - H * 0.20, speed: 8, big: false, color: "#ff9f43" },
    ];
    const particles = [];

    function explode(r) {
      const count = r.big ? 500 : 120;
      const spMax = r.big ? 13 : 8;
      const spMin = r.big ? 3 : 2;
      const sizeMax = r.big ? 8 : 5;
      const sizeMin = r.big ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = Math.random() * (spMax - spMin) + spMin;
        particles.push({
          x: r.x, y: r.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 1,
          decay: 0.006 + Math.random() * 0.014,
          size: sizeMin + Math.random() * (sizeMax - sizeMin),
        });
      }
      if (r.big) {
        // 中心闪光
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = Math.random() * 4 + 1;
          particles.push({
            x: r.x, y: r.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            color: "#fff3b0",
            life: 1,
            decay: 0.06 + Math.random() * 0.04,
            size: 9 + Math.random() * 7,
          });
        }
      }
    }

    function frame() {
      // 拖尾清屏
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // 火箭上升
      for (const r of rockets) {
        if (r.y <= r.ty) continue;
        r.y -= r.speed;
        ctx.globalAlpha = 1;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.big ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (r.y <= r.ty) explode(r);
      }

      // 粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.99;
        p.vy = p.vy * 0.99 + 0.06;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const allExploded = rockets.every((r) => r.y <= r.ty);
      if (allExploded && particles.length === 0) {
        canvas.remove();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  return { shatter, bigFirework };
})();
