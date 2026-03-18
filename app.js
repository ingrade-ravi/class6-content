/* Arduino UNO Learning Hub - vanilla JS SPA */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const data = {
  quiz: [
    {
      q: "Which microcontroller is used on most Arduino UNO R3 boards?",
      options: ["ATmega328P", "ESP32", "ATtiny85", "STM32F103"],
      answer: 0,
      why: "UNO R3 typically uses the ATmega328P as the main MCU.",
    },
    {
      q: "How many digital I/O pins does the Arduino UNO have?",
      options: ["8", "14", "20", "32"],
      answer: 1,
      why: "UNO provides 14 digital I/O pins (0–13).",
    },
    {
      q: "How many analog input pins (ADC channels) are available on Arduino UNO?",
      options: ["4", "6", "8", "12"],
      answer: 1,
      why: "UNO has 6 analog inputs labeled A0–A5.",
    },
    {
      q: "What is the typical logic level voltage for Arduino UNO digital pins?",
      options: ["3.3V", "5V", "1.8V", "12V"],
      answer: 1,
      why: "UNO is a 5V logic board (most pins are 5V tolerant/5V logic).",
    },
    {
      q: "Which pins on UNO are commonly used for hardware UART serial?",
      options: ["A4/A5", "D0/D1", "D10/D11", "D2/D3"],
      answer: 1,
      why: "D0 = RX and D1 = TX are the hardware serial pins.",
    },
    {
      q: "Which pins are used for I2C on Arduino UNO?",
      options: ["D0/D1", "D10/D11", "A4 (SDA) / A5 (SCL)", "D5/D6"],
      answer: 2,
      why: "On UNO, I2C is on A4 (SDA) and A5 (SCL).",
    },
    {
      q: "Which pins are used for SPI on Arduino UNO (hardware SPI header aside)?",
      options: ["D10–D13", "A0–A3", "D2–D5", "D6–D9"],
      answer: 0,
      why: "Hardware SPI uses D10 (SS), D11 (MOSI), D12 (MISO), D13 (SCK).",
    },
    {
      q: "What does PWM stand for in the context of Arduino UNO?",
      options: ["Pulse Width Modulation", "Power Watt Meter", "Pin Write Mode", "Peripheral Wire Multiplexer"],
      answer: 0,
      why: "PWM is Pulse Width Modulation, used to approximate analog output on certain pins.",
    },
    {
      q: "What is the typical maximum ADC resolution on Arduino UNO?",
      options: ["8-bit", "10-bit", "12-bit", "16-bit"],
      answer: 1,
      why: "UNO uses a 10-bit ADC (values 0–1023 by default).",
    },
    {
      q: "What is the default clock frequency of the Arduino UNO?",
      options: ["8 MHz", "16 MHz", "32 MHz", "48 MHz"],
      answer: 1,
      why: "UNO commonly runs at 16 MHz.",
    },
  ],
  flashcards: [
    { front: "UNO main MCU?", back: "ATmega328P (most UNO R3 boards)." },
    { front: "Digital I/O count?", back: "14 pins (D0–D13)." },
    { front: "Analog inputs?", back: "6 inputs (A0–A5), 10-bit ADC." },
    { front: "Logic level?", back: "5V logic (typical UNO)." },
    { front: "UART pins?", back: "D0 (RX), D1 (TX)." },
    { front: "I2C pins?", back: "A4 = SDA, A5 = SCL." },
    { front: "SPI pins?", back: "D10 SS, D11 MOSI, D12 MISO, D13 SCK." },
    { front: "PWM meaning?", back: "Pulse Width Modulation (simulated analog output)." },
    { front: "PWM pins (common)?", back: "D3, D5, D6, D9, D10, D11 (UNO)." },
    { front: "Default clock?", back: "16 MHz." },
  ],
};

const app = {
  route: "home",
  soundEnabled: true,
  quiz: {
    order: [],
    i: 0,
    locked: false,
    score: 0,
    selected: null,
  },
  flashcards: {
    i: 0,
    flipped: false,
  },
};

// ---------- Sound (tiny synth clicks, no assets) ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}
function clickSound(type = "tap") {
  if (!app.soundEnabled) return;
  try {
    ensureAudio();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(type === "good" ? 560 : type === "bad" ? 180 : 420, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(type === "bad" ? 0.05 : 0.03, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.095);
  } catch {
    // ignore
  }
}

// ---------- Routing ----------
function setRoute(route) {
  const view = $$("[data-view]").find((v) => v.dataset.view === route);
  if (!view) return;

  app.route = route;
  $$("[data-view]").forEach((v) => v.classList.remove("view--active"));
  view.classList.add("view--active");
  view.classList.remove("view-anim-in");
  // force reflow for animation restart
  void view.offsetWidth;
  view.classList.add("view-anim-in");

  $$("[data-route]").forEach((b) => {
    const isCurrent = b.dataset.route === route;
    b.setAttribute("aria-current", isCurrent ? "page" : "false");
  });

  if (route === "quiz") renderQuiz();
  if (route === "flashcards") renderFlashcard();
}

function routeFromHash() {
  const h = (location.hash || "#home").replace("#", "").trim();
  return ["home", "quiz", "flashcards"].includes(h) ? h : "home";
}

function syncHash(route) {
  const target = `#${route}`;
  if (location.hash !== target) history.replaceState(null, "", target);
}

// ---------- Quiz ----------
function newQuiz() {
  const idx = data.quiz.map((_, i) => i);
  // shuffle
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  app.quiz.order = idx;
  app.quiz.i = 0;
  app.quiz.locked = false;
  app.quiz.score = 0;
  app.quiz.selected = null;

  $("#result").hidden = true;
  $("#quizCard").hidden = false;
  $("#scoreNow").textContent = "0";
  $("#scoreTotal").textContent = String(data.quiz.length);
}

function getQuizItem() {
  const q = data.quiz[app.quiz.order[app.quiz.i]];
  return q;
}

function updateQuizProgress() {
  const total = data.quiz.length;
  const now = clamp(app.quiz.i + 1, 1, total);
  $("#progressText").textContent = `Question ${now}/${total}`;
  $("#progressBar").style.width = `${(now / total) * 100}%`;
  $("#scoreNow").textContent = String(app.quiz.score);
  $("#scoreTotal").textContent = String(total);
}

function renderQuiz() {
  if (!app.quiz.order.length) newQuiz();

  const q = getQuizItem();
  app.quiz.locked = false;
  app.quiz.selected = null;
  $("#nextBtn").disabled = true;

  updateQuizProgress();

  const card = $("#quizCard");
  card.classList.remove("view-anim-swap");
  void card.offsetWidth;
  card.classList.add("view-anim-swap");

  $("#questionText").textContent = q.q;
  const answers = $("#answers");
  answers.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer hoverable";
    btn.dataset.idx = String(i);
    btn.innerHTML = `
      <span class="answer__key">${i + 1}</span>
      <span class="answer__text">${escapeHtml(opt)}</span>
    `;
    btn.addEventListener("click", () => chooseAnswer(i));
    answers.appendChild(btn);
  });
}

function lockAnswers({ chosen, correct }) {
  $$(".answer").forEach((el) => {
    el.classList.add("answer--locked");
    const idx = Number(el.dataset.idx);
    if (idx === correct) el.classList.add("answer--correct");
    if (idx === chosen && chosen !== correct) el.classList.add("answer--wrong");
  });
}

function chooseAnswer(i) {
  if (app.route !== "quiz") return;
  if (app.quiz.locked) return;

  const q = getQuizItem();
  app.quiz.locked = true;
  app.quiz.selected = i;
  $("#nextBtn").disabled = false;

  const isCorrect = i === q.answer;
  if (isCorrect) app.quiz.score += 1;
  $("#scoreNow").textContent = String(app.quiz.score);

  lockAnswers({ chosen: i, correct: q.answer });
  clickSound(isCorrect ? "good" : "bad");
}

function nextQuiz() {
  if (app.route !== "quiz") return;
  if (!app.quiz.locked) return;

  const total = data.quiz.length;
  if (app.quiz.i >= total - 1) return finishQuiz();

  app.quiz.i += 1;
  renderQuiz();
  clickSound("tap");
}

function finishQuiz() {
  const total = data.quiz.length;
  $("#quizCard").hidden = true;

  $("#finalScore").textContent = String(app.quiz.score);
  $("#finalTotal").textContent = String(total);

  const pct = Math.round((app.quiz.score / total) * 100);
  $("#resultLine").textContent =
    pct >= 90
      ? "Elite signal. You’re ready to build."
      : pct >= 70
        ? "Strong work—now reinforce the weak spots."
        : pct >= 50
          ? "Good start. Hit flashcards and try again."
          : "No worries—learn the basics, then rerun the mission.";

  $("#result").hidden = false;
  $("#result").classList.remove("view-anim-in");
  void $("#result").offsetWidth;
  $("#result").classList.add("view-anim-in");
  clickSound("good");
}

// ---------- Flashcards ----------
function renderFlashcard() {
  const total = data.flashcards.length;
  app.flashcards.i = clamp(app.flashcards.i, 0, total - 1);
  const c = data.flashcards[app.flashcards.i];

  $("#fcFront").textContent = c.front;
  $("#fcBack").textContent = c.back;
  $("#fcNow").textContent = String(app.flashcards.i + 1);
  $("#fcTotal").textContent = String(total);

  setFlipped(app.flashcards.flipped);
  $("#fcPrevBtn").disabled = app.flashcards.i === 0;
  $("#fcNextBtn").disabled = app.flashcards.i === total - 1;
}

function setFlipped(flipped) {
  app.flashcards.flipped = flipped;
  $("#fcCard").classList.toggle("is-flipped", flipped);
}

function flipCard() {
  if (app.route !== "flashcards") return;
  setFlipped(!app.flashcards.flipped);
  clickSound("tap");
}

function nextCard(dir) {
  if (app.route !== "flashcards") return;
  const total = data.flashcards.length;
  const next = clamp(app.flashcards.i + dir, 0, total - 1);
  if (next === app.flashcards.i) return;
  app.flashcards.i = next;
  setFlipped(false);
  renderFlashcard();
  clickSound("tap");
}

// ---------- Cursor + trail ----------
function initCursor() {
  const cursor = $(".cursor");
  const trailRoot = $(".cursor-trail");
  if (!cursor || !trailRoot) return;

  const dots = [];
  const DOTS = 14;
  for (let i = 0; i < DOTS; i++) {
    const d = document.createElement("div");
    d.className = "trail-dot";
    d.style.opacity = "0";
    trailRoot.appendChild(d);
    dots.push({
      el: d,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: 0,
      vy: 0,
    });
  }

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let x = mx;
  let y = my;

  window.addEventListener(
    "mousemove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "mousedown",
    () => cursor.classList.add("is-down"),
    { passive: true }
  );
  window.addEventListener(
    "mouseup",
    () => cursor.classList.remove("is-down"),
    { passive: true }
  );

  const hoverOn = () => cursor.classList.add("is-hover");
  const hoverOff = () => cursor.classList.remove("is-hover");
  document.addEventListener(
    "pointerover",
    (e) => {
      const t = e.target;
      if (t && t.closest && t.closest(".hoverable")) hoverOn();
    },
    { passive: true }
  );
  document.addEventListener(
    "pointerout",
    (e) => {
      const t = e.target;
      if (t && t.closest && t.closest(".hoverable")) hoverOff();
    },
    { passive: true }
  );

  const tick = () => {
    // cursor lag
    x = lerp(x, mx, 0.18);
    y = lerp(y, my, 0.18);
    cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;

    // trail particles
    let px = x;
    let py = y;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const k = 0.16 + i * 0.012;
      d.x = lerp(d.x, px, k);
      d.y = lerp(d.y, py, k);
      px = d.x;
      py = d.y;

      const a = 0.42 * (1 - i / dots.length);
      d.el.style.opacity = String(a);
      const s = 1 - i / (dots.length * 1.25);
      d.el.style.transform = `translate(${d.x}px, ${d.y}px) translate(-50%, -50%) scale(${s})`;
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- Background particles (canvas) ----------
function initBackground() {
  const canvas = $("#bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let w = 0,
    h = 0;
  const particles = [];
  const N = 70;

  function resize() {
    w = Math.floor(window.innerWidth * DPR);
    h = Math.floor(window.innerHeight * DPR);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  function spawn() {
    particles.length = 0;
    for (let i = 0; i < N; i++) {
      const blue = Math.random() < 0.58;
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (blue ? 1.6 : 1.9) + Math.random() * 2.6,
        vx: (Math.random() - 0.5) * (blue ? 0.15 : 0.12) * DPR,
        vy: (Math.random() - 0.5) * (blue ? 0.10 : 0.14) * DPR,
        a: 0.10 + Math.random() * 0.22,
        c: blue ? "54,179,255" : "255,35,72",
      });
    }
  }
  spawn();

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // subtle vignetting / glow
    const g = ctx.createRadialGradient(w * 0.5, h * 0.15, 10, w * 0.5, h * 0.15, Math.max(w, h) * 0.7);
    g.addColorStop(0, "rgba(54,179,255,0.06)");
    g.addColorStop(0.35, "rgba(255,35,72,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -40) p.x = w + 40;
      if (p.x > w + 40) p.x = -40;
      if (p.y < -40) p.y = h + 40;
      if (p.y > h + 40) p.y = -40;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// ---------- Utilities ----------
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Wire up ----------
function init() {
  // initial totals
  $("#scoreTotal").textContent = String(data.quiz.length);
  $("#fcTotal").textContent = String(data.flashcards.length);

  // routing buttons
  document.addEventListener("click", (e) => {
    const t = e.target;
    const btn = t && t.closest ? t.closest("[data-route]") : null;
    if (!btn) return;
    const r = btn.dataset.route;
    if (!r) return;
    clickSound("tap");
    syncHash(r);
    setRoute(r);
  });

  // sound toggle
  const st = $("#soundToggle");
  if (st) {
    app.soundEnabled = Boolean(st.checked);
    st.addEventListener("change", () => {
      app.soundEnabled = Boolean(st.checked);
      clickSound("tap");
    });
  }

  // quiz controls
  $("#nextBtn").addEventListener("click", nextQuiz);
  $("#quizBackBtn").addEventListener("click", () => {
    clickSound("tap");
    syncHash("home");
    setRoute("home");
  });
  $("#restartQuizBtn").addEventListener("click", () => {
    clickSound("tap");
    newQuiz();
    renderQuiz();
  });

  // flashcards controls
  $("#fcCard").addEventListener("click", flipCard);
  $("#fcFlipBtn").addEventListener("click", flipCard);
  $("#fcPrevBtn").addEventListener("click", () => nextCard(-1));
  $("#fcNextBtn").addEventListener("click", () => nextCard(1));

  // keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (app.route === "quiz") {
      const k = e.key;
      if (k >= "1" && k <= "4") {
        const idx = Number(k) - 1;
        chooseAnswer(idx);
      } else if (k === "Enter") {
        nextQuiz();
      }
    } else if (app.route === "flashcards") {
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        flipCard();
      } else if (e.key === "ArrowLeft") {
        nextCard(-1);
      } else if (e.key === "ArrowRight") {
        nextCard(1);
      }
    }
  });

  // hash routing
  window.addEventListener("hashchange", () => {
    const r = routeFromHash();
    setRoute(r);
  });

  initCursor();
  initBackground();

  // Start
  const initial = routeFromHash();
  syncHash(initial);
  setRoute(initial);
}

document.addEventListener("DOMContentLoaded", init);

