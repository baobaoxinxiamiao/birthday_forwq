// ===== 烟花效果（Canvas 粒子） =====
(function () {
  const COLORS = [
    "#ffd93d", "#ff6b6b", "#ff9f43", "#ff77e9",
    "#6c5ce7", "#00d2ff", "#2ed573", "#ff4757", "#feca57",
  ];

  function startFireworks(canvas) {
    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const rockets = [];
    const particles = [];

    window.addEventListener("resize", () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    });

    function pick() {
      return COLORS[(Math.random() * COLORS.length) | 0];
    }

    // 发射一枚烟花弹
    function launch() {
      const x = W * (0.15 + Math.random() * 0.7);
      rockets.push({
        x: x,
        y: H,
        tx: x + (Math.random() - 0.5) * 140,
        ty: H * (0.15 + Math.random() * 0.42),
        speed: 6 + Math.random() * 4,
        color: pick(),
      });
    }

    // 爆炸成粒子
    function explode(r) {
      const count = 70 + ((Math.random() * 50) | 0);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
        const speed = 1 + Math.random() * 4.2;
        particles.push({
          x: r.tx,
          y: r.ty,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() < 0.65 ? r.color : pick(),
          life: 1,
          decay: 0.008 + Math.random() * 0.016,
          size: 1.5 + Math.random() * 1.6,
        });
      }
    }

    function frame() {
      // 拖尾：淡化上一帧
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // 火箭上升
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += (r.tx - r.x) * 0.02;
        r.y -= r.speed;
        ctx.globalAlpha = 1;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fill();
        if (r.y <= r.ty) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      // 粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.99;
        p.vy = p.vy * 0.99 + 0.035;
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

      requestAnimationFrame(frame);
    }

    // 开场连发，之后定时发射
    launch();
    launch();
    launch();
    const timer = setInterval(() => {
      launch();
      if (Math.random() < 0.5) launch();
    }, 480);

    requestAnimationFrame(frame);

    // 返回停止函数（供后续关卡使用）
    return function stop() {
      clearInterval(timer);
    };
  }

  window.startFireworks = startFireworks;
})();
