// ===== 朋友信息 =====
const FRIEND_NAME = "我琦";

// ===== 问卷数据 =====
// 前 6 题大学生化，第 7 题问心情，第 8 题图穷匕见
const questions = [
  { q: "您的性别是？", options: ["男", "女"] },
  { q: "您的年级是？", options: ["大一", "大二", "大三", "大四", "研究生及以上"] },
  { q: "您的专业属于哪一类？", options: ["理工类", "文史类", "经管类", "艺术类", "其他"] },
  { q: "您平均每月的生活费大约是？", options: ["1000 元以下", "1000 - 1500 元", "1500 - 2000 元", "2000 - 3000 元", "3000 元以上"] },
  { q: "您目前的居住情况是？", options: ["学校宿舍", "校外租房", "走读（住家）", "其他"] },
  { q: "您平时最主要的休闲方式是？", options: ["刷短视频", "打游戏", "运动健身", "阅读", "和朋友聚会"] },
  { q: "您今天的心情如何？", options: ["😄 特别好", "🙂 还不错", "😐 一般般", "😔 有点低落"] },
  { q: "您知道今天是什么日子吗？", options: ["一个普普通通的日子", "好像是某个节日", "该不会是我的生日吧 🎂", "没太注意"] },
];

// ===== DOM 引用 =====
const survey = document.getElementById("survey");
const surprise = document.getElementById("surprise");

const submitBtn = document.getElementById("submitBtn");
const questionsEl = document.getElementById("questions");
const formError = document.getElementById("formError");

const actDone = document.getElementById("actDone");
const blackout = document.getElementById("blackout");
const actCake = document.getElementById("actCake");
const actNext = document.getElementById("actNext");

const cakeTitle = document.getElementById("cakeTitle");
const blowBtn = document.getElementById("blowBtn");
const cakeScene = document.getElementById("cakeScene");

const fxCanvas = document.getElementById("fxCanvas");

// ===== 状态 =====
const answers = new Array(questions.length).fill(null);

// ===== 屏幕切换 =====
function showScreen(screen) {
  survey.classList.remove("is-active");
  surprise.classList.remove("is-active");
  screen.classList.add("is-active");
}

// ===== 渲染所有题目 =====
function renderAll() {
  questionsEl.innerHTML = "";

  questions.forEach((q, qi) => {
    const field = document.createElement("div");
    field.className = "field";
    field.id = `field-${qi}`;

    const label = document.createElement("div");
    label.className = "field__label";
    label.innerHTML = `<span class="field__req">*</span>${qi + 1}. ${q.q}`;

    const opts = document.createElement("div");
    opts.className = "field__options";

    q.options.forEach((opt, oi) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "option";
      b.textContent = opt;
      b.addEventListener("click", () => select(qi, oi));
      opts.appendChild(b);
    });

    field.appendChild(label);
    field.appendChild(opts);
    questionsEl.appendChild(field);
  });
}

// 选中某题的某个选项
function select(qi, oi) {
  answers[qi] = oi;
  const field = document.getElementById(`field-${qi}`);
  field
    .querySelectorAll(".option")
    .forEach((o, i) => o.classList.toggle("is-selected", i === oi));
  field.classList.remove("is-error");
  formError.hidden = true;
}

// ===== 提交 =====
submitBtn.addEventListener("click", () => {
  const missing = [];
  answers.forEach((a, i) => {
    if (a === null) missing.push(i);
  });

  if (missing.length > 0) {
    // 标红所有未答题，滚动到第一道未答题
    missing.forEach((i) => {
      const f = document.getElementById(`field-${i}`);
      f.classList.remove("is-error");
      void f.offsetWidth; // 强制重排，让抖动动画重新播放
      f.classList.add("is-error");
    });
    document
      .getElementById(`field-${missing[0]}`)
      .scrollIntoView({ behavior: "smooth", block: "center" });

    formError.textContent = `请回答第 ${missing[0] + 1} 题`;
    formError.hidden = false;
    return;
  }

  submit();
});

function submit() {
  cakeTitle.textContent = `祝${FRIEND_NAME}生日快乐`;
  showScreen(surprise);

  // 第 0 幕：完成问卷，停约 1.8 秒
  setTimeout(() => {
    // 突然黑屏
    actDone.hidden = true;
    blackout.hidden = false;

    setTimeout(() => {
      // 蛋糕浮现，并初始化 3D 蛋糕（此时容器已有尺寸）
      actCake.hidden = false;
      Cake3D.init(cakeScene);
      blackout.classList.add("fade");

      setTimeout(() => {
        blackout.hidden = true;
        blackout.classList.remove("fade");
      }, 620);
    }, 900);
  }, 1800);
}

// ===== 吹灭蜡烛 =====
blowBtn.addEventListener("click", () => {
  blowBtn.disabled = true;
  Cake3D.blowOut();

  // 火焰熄灭后，进入下一幕：烟花 + 视频
  setTimeout(() => {
    actCake.hidden = true;
    actNext.hidden = false;
    startFireworks(fxCanvas);

    const video = document.getElementById("birthdayVideo");
    if (video) {
      video.play().catch(() => {});
      video.addEventListener("ended", onVideoEnded);
    }
  }, 800);
});

// 视频播放完后：碎裂 + 巨大烟花
function onVideoEnded() {
  const video = document.getElementById("birthdayVideo");
  const rect = video.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  FinalEffect.shatter(video, () => {
    FinalEffect.bigFirework(cx, cy);
  });
}

renderAll();
