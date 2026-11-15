const canvas = document.getElementById('questCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  if (stage === 1) setupStage1();
  if (stage === 3) setupStage3();
  if (stage === 4) setupStage4();
  if (stage === 6) setupStage6();
});

const palette = new Array('#fff6eb', '#eac38b', '#f497b6', '#ffd6e0', '#d8b4e2', '#ffdfba');

let stage = 1;
let time = 0;
let lastFrameTime = performance.now();
let stageTimeLeft = 14.0;
let timerActive = false;

let sparks = new Array();
let shockwaves = new Array();
let smokeParticles = new Array();

// ==========================================
// AUDIO ENGINE
// ==========================================
let audioCtx = null;
let isMelodyPlaying = false;

function initAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, duration = 1.1, type = 'sine', volume = 0.16) {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration + 0.05);
}

function playChime(index = 0) {
  const scale = new Array(523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50);
  playTone(scale.at(index % scale.length), 1.2, 'sine', 0.16);
}

function playErrorTone() {
  playTone(155.00, 0.65, 'triangle', 0.16);
}

function playBlowSound() {
  initAudio();
  const bufferSize = audioCtx.sampleRate * 0.25;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data.fill((Math.random() * 2 - 1) * (1 - i / bufferSize), i, i + 1);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(600, audioCtx.currentTime);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.24);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
}

function playFullHBD() {
  initAudio();
  if (isMelodyPlaying) return;
  isMelodyPlaying = true;

  const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23;
  const G4 = 392.00, A4 = 440.00, Bb4 = 466.16, C5 = 523.25;
  const F3 = 174.61, C3 = 130.81, Bb3 = 233.08;

  const beat = 0.45;
  const notes = new Array(
    { f: C4, d: 0.75 }, { f: C4, d: 0.25 }, { f: D4, d: 1, chord: new Array(F3, A4) }, { f: C4, d: 1 }, { f: F4, d: 1 }, { f: E4, d: 2, chord: new Array(C3, G4) },
    { f: C4, d: 0.75 }, { f: C4, d: 0.25 }, { f: D4, d: 1, chord: new Array(C3, G4) }, { f: C4, d: 1 }, { f: G4, d: 1 }, { f: F4, d: 2, chord: new Array(F3, A4) },
    { f: C4, d: 0.75 }, { f: C4, d: 0.25 }, { f: C5, d: 1, chord: new Array(F3, A4) }, { f: A4, d: 1 }, { f: F4, d: 1 }, { f: E4, d: 1, chord: new Array(Bb3, D4) }, { f: D4, d: 2 },
    { f: Bb4, d: 0.75 }, { f: Bb4, d: 0.25 }, { f: A4, d: 1, chord: new Array(F3, C4) }, { f: F4, d: 1 }, { f: G4, d: 1, chord: new Array(C3, E4) }, { f: F4, d: 3.0, chord: new Array(F3, A4, C5) }
  );

  let t = audioCtx.currentTime + 0.1;
  notes.forEach(n => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.f, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d * beat + 0.9);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + n.d * beat + 1.0);

    if (n.chord) {
      n.chord.forEach(cf => {
        const cOsc = audioCtx.createOscillator();
        const cGain = audioCtx.createGain();
        cOsc.type = 'sine';
        cOsc.frequency.setValueAtTime(cf, t);
        cGain.gain.setValueAtTime(0.0001, t);
        cGain.gain.exponentialRampToValueAtTime(0.055, t + 0.25);
        cGain.gain.exponentialRampToValueAtTime(0.0001, t + n.d * beat * 2.4);
        cOsc.connect(cGain);
        cGain.connect(audioCtx.destination);
        cOsc.start(t);
        cOsc.stop(t + n.d * beat * 2.5);
      });
    }
    t += n.d * beat;
  });

  const total = notes.reduce((s, n) => s + n.d * beat, 0);
  setTimeout(() => { isMelodyPlaying = false; }, total * 1000 + 1000);
}

// ==========================================
// VISUAL EFFECTS
// ==========================================
class Spark {
  constructor(x, y, vx, vy, color, size = 2, trail = 5) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.alpha = 1;
    this.decay = 0.01 + Math.random() * 0.01;
    this.history = new Array();
    this.trail = trail;
  }
  update() {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > this.trail) this.history.shift();
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.vy += 0.04;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;

    if (this.history.length > 1) {
      ctx.lineWidth = this.size;
      ctx.beginPath();
      const firstPt = this.history.at(0);
      ctx.moveTo(firstPt.x, firstPt.y);
      this.history.forEach((pt, idx) => {
        if (idx > 0) ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class Smoke {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = -1.2 - Math.random() * 1.2;
    this.r = 4 + Math.random() * 4;
    this.alpha = 0.65;
  }
  update() {
    this.x += this.vx + Math.sin(time * 3 + this.y * 0.05) * 0.4;
    this.y += this.vy;
    this.r += 0.25;
    this.alpha -= 0.012;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = 'rgba(235, 225, 240, 0.5)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Wave {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.alpha = 0.85;
    this.color = color;
  }
  update() {
    this.r += 7;
    this.alpha -= 0.018;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function spawnBurst(x, y, count = 60, colorOverride = null) {
  const col = colorOverride || palette.at(Math.floor(Math.random() * palette.length));
  shockwaves.push(new Wave(x, y, col));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 7;
    const c = colorOverride || palette.at(Math.floor(Math.random() * palette.length));
    sparks.push(new Spark(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, c, 1.8, 6));
  }
}

// ==========================================
// STAGE 1: CELESTIAL HIERARCHY (6 STARS BY SIZE)
// ==========================================
let starsStage1 = new Array();
let nextExpectedRank = 1;

function setupStage1() {
  nextExpectedRank = 1;
  starsStage1 = new Array();
  const count = 6;
  const dist = Math.min(width, height) * 0.27;

  const ranks = new Array(1, 2, 3, 4, 5, 6);
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = ranks.at(i);
    ranks.splice(i, 1, ranks.at(j));
    ranks.splice(j, 1, temp);
  }

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    const rank = ranks.at(i);
    starsStage1.push({
      baseX: width / 2 + Math.cos(angle) * dist,
      baseY: height / 2 + Math.sin(angle) * dist,
      x: 0, y: 0,
      phase: i * 1.3,
      rank: rank,
      radius: 3.5 + rank * 2.4,
      lit: false
    });
  }
}

// ==========================================
// STAGE 2: BEACON CIPHER (COUNT THE FLASHES)
// ==========================================
let cipherCode = new Array();
let enteredCode = new Array();
let beaconGlow = 0;
let beaconTimers = new Array();

const cipherPad = document.getElementById('cipherPad');
for (let num = 1; num <= 9; num++) {
  const btn = document.createElement('div');
  btn.className = 'cipher-btn';
  btn.textContent = num;
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    handleCipherInput(num);
  });
  cipherPad.appendChild(btn);
}

function clearBeaconTimers() {
  beaconTimers.forEach(id => clearTimeout(id));
  beaconTimers = new Array();
}

function setupStage2() {
  clearBeaconTimers();
  enteredCode = new Array();
  updateCipherSlots();

  cipherCode = new Array(
    2 + Math.floor(Math.random() * 4),
    2 + Math.floor(Math.random() * 4),
    2 + Math.floor(Math.random() * 4)
  );

  function runBeaconCycle() {
    if (stage !== 2) return;
    let delay = 350;

    cipherCode.forEach((count) => {
      for (let f = 0; f < count; f++) {
      const tId = setTimeout(() => {
      if (stage !== 2) return;
      beaconGlow = 1.0;
      playTone(659.25, 0.25, 'sine', 0.14);
      spawnBurst(width / 2, height * 0.24, 15, '#eac38b');
      }, delay);
      beaconTimers.push(tId);
      delay += 380;
      }
      delay += 850;
      });
      const loopId = setTimeout(runBeaconCycle, delay + 1100);
      beaconTimers.push(loopId);
      }
      runBeaconCycle();
      }
      function updateCipherSlots() {
      for (let i = 0; i < 3; i++) {
      const slot = document.getElementById('slot' + i);
      slot.textContent = enteredCode.length > i ? enteredCode.at(i) : '·';
      }
      }
      function handleCipherInput(num) {
      if (stage !== 2 || enteredCode.length >= 3) return;
      initAudio();
      playChime(num);
      enteredCode.push(num);
      updateCipherSlots();
      if (enteredCode.length === 3) {
      const isCorrect =
      enteredCode.at(0) === cipherCode.at(0) &&
      enteredCode.at(1) === cipherCode.at(1) &&
      enteredCode.at(2) === cipherCode.at(2);
      if (isCorrect) {
      clearBeaconTimers();
      timerActive = false;
      spawnBurst(width / 2, height / 2, 95, '#eac38b');
      setTimeout(() => setStage(3), 650);
      } else {
      playErrorTone();
      spawnBurst(width / 2, height * 0.45, 35, '#ff4d6d');
      setTimeout(() => {
      enteredCode = new Array();
      updateCipherSlots();
      }, 450);
      }
      }
      }
      // ==========================================
      // STAGE 3: HARMONIC MEMORY (5 STEPS)
      // ==========================================
      let memoryPads = new Array();
      let memorySequence = new Array();
      let playerStep = 0;
      let isShowingSequence = false;
      let activePadIndex = -1;
      function setupStage3() {
      memoryPads = new Array();
      const offset = Math.min(width, height) * 0.19;
      const coords = new Array(
      { x: width / 2, y: height / 2 - offset, color: '#eac38b', freq: 523.25 },
      { x: width / 2 + offset, y: height / 2, color: '#f497b6', freq: 659.25 },
      { x: width / 2, y: height / 2 + offset, color: '#d8b4e2', freq: 783.99 },
      { x: width / 2 - offset, y: height / 2, color: '#fff6eb', freq: 1046.50 }
      );
      coords.forEach((c, i) => {
      memoryPads.push({ ...c, id: i });
      });
      }
      function playMemorySequence() {
      isShowingSequence = true;
      timerActive = false;
      playerStep = 0;
      document.getElementById('stepSub').textContent = 'OBSERVE THE 5 HARMONIC PULSES...';
      memorySequence.forEach((padIdx, step) => {
      setTimeout(() => {
      if (stage !== 3) return;
      activePadIndex = padIdx;
      const currentPad = memoryPads.at(padIdx);
      playTone(currentPad.freq, 0.45, 'sine', 0.18);
      spawnBurst(currentPad.x, currentPad.y, 18, currentPad.color);
      setTimeout(() => { activePadIndex = -1; }, 320);
      }, (step + 1) * 620);
      });
      setTimeout(() => {
      if (stage !== 3) return;
      isShowingSequence = false;
      timerActive = true;
      document.getElementById('stepSub').textContent = 'REPEAT THE SEQUENCE BEFORE TIME EXPIRES';
      }, (memorySequence.length + 1) * 620);
      }
      function initStage3() {
      setupStage3();
      memorySequence = new Array();
      for (let i = 0; i < 5; i++) {
      memorySequence.push(Math.floor(Math.random() * 4));
      }
      playMemorySequence();
      }
      // ==========================================
      // STAGE 4: MIRROR SYMMETRY (REFLECT 4 NODES)
      // ==========================================
      let leftConstellation = new Array();
      let rightTargets = new Array();
      function setupStage4() {
      leftConstellation = new Array();
      rightTargets = new Array();
      const cx = width / 2;
      const cy = height / 2;
      const spanX = Math.min(width * 0.34, 170);
      const spanY = Math.min(height * 0.24, 150);
      const offsets = new Array(
      { dx: -spanX * 0.85, dy: -spanY * 0.75 },
      { dx: -spanX * 0.35, dy: -spanY * 0.25 },
      { dx: -spanX * 0.90, dy: spanY * 0.45 },
      { dx: -spanX * 0.45, dy: spanY * 0.85 }
      );
      offsets.forEach((off, idx) => {
      leftConstellation.push({ x: cx + off.dx, y: cy + off.dy });
      rightTargets.push({
      x: cx - off.dx,
      y: cy + off.dy,
      lit: false,
      index: idx
      });
      });
      }
      // ==========================================
      // STAGE 5: CHRONO ASTROLABE (3 RINGS)
      // ==========================================
      let rings = new Array();
      let currentRingIdx = 0;
      function initStage5() {
      currentRingIdx = 0;
      rings = new Array(
      { radius: 75, angle: Math.random() * Math.PI * 2, speed: 0.048, locked: false, color: '#eac38b' },
      { radius: 115, angle: Math.random() * Math.PI * 2, speed: -0.062, locked: false, color: '#f497b6' },
      { radius: 155, angle: Math.random() * Math.PI * 2, speed: 0.075, locked: false, color: '#fff6eb' }
      );
      }
      // ==========================================
      // STAGE 6: BIRTHDAY CAKE & 5 CANDLES
      // ==========================================
      let candles = new Array();
      function setupStage6() {
      candles = new Array();
      const cx = width / 2;
      const cy = height / 2 + 20;
      const spacing = 42;
      for (let i = -2; i <= 2; i++) {
      candles.push({
      x: cx + i * spacing,
      y: cy - 88,
      flamePower: 1.0,
      phase: i * 1.5
      });
      }
      }
      // ==========================================
      // STAGE 7: 3D LOTUS BLOOM FINALE
      // ==========================================
      const NUM_3D = 850;
      let points3D = new Array();
      for (let i = 0; i < NUM_3D; i++) {
      const u = (i / NUM_3D) * Math.PI * 14;
      const v = (i % 40) / 40;
      const petals = 6;
      const rFlower = (75 + 110 * Math.sin(petals * u) * Math.sin(v * Math.PI)) * (0.4 + 0.7 * v);
      const fx = rFlower * Math.cos(u);
      const fy = rFlower * Math.sin(u);
      const fz = (v - 0.5) * 125 + Math.cos(petals * u) * 30;
      points3D.push({
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      z: (Math.random() - 0.5) * 400,
      fx, fy, fz,
      color: palette.at(i % palette.length),
      size: 1.5 + Math.random() * 1.5
      });
      }
      // ==========================================
      // STAGE & HARDCORE TIMER CONTROLLER
      // ==========================================
      function setStage(next) {
      stage = next;
      const numEl = document.getElementById('stepNum');
      const titleEl = document.getElementById('stepTitle');
      const subEl = document.getElementById('stepSub');
      const timerEl = document.getElementById('timerDisplay');
      const cipherPanel = document.getElementById('cipherPanel');
      clearBeaconTimers();
      cipherPanel.style.display = 'none';
      timerEl.classList.remove('danger');
      for (let i = 1; i <= 7; i++) {
      const dot = document.getElementById('dot' + i);
      if (i < stage) dot.className = 'step-dot done';
      else if (i === stage) dot.className = 'step-dot active';
      else dot.className = 'step-dot';
      }
      if (stage === 1) {
      stageTimeLeft = 14.0;
      timerActive = true;
      numEl.textContent = 'I / VII';
      titleEl.textContent = 'CELESTIAL HIERARCHY';
      subEl.textContent = 'IGNITE ALL 6 STARS FROM SMALLEST TO LARGEST';
      setupStage1();
      } else if (stage === 2) {
      stageTimeLeft = 28.0;
      timerActive = true;
      numEl.textContent = 'II / VII';
      titleEl.textContent = 'THE CIPHER OF LIGHT';
      subEl.textContent = 'COUNT THE 3 FLASH GROUPS FROM THE BEACON';
      cipherPanel.style.display = 'flex';
      setupStage2();
      spawnBurst(width / 2, height / 2, 80, '#eac38b');
      } else if (stage === 3) {
      stageTimeLeft = 12.0;
      timerActive = false;
      numEl.textContent = 'III / VII';
      titleEl.textContent = 'HARMONIC RESONANCE';
      initStage3();
      spawnBurst(width / 2, height / 2, 80, '#f497b6');
      } else if (stage === 4) {
      stageTimeLeft = 24.0;
      timerActive = true;
      numEl.textContent = 'IV / VII';
      titleEl.textContent = 'MIRROR SYMMETRY';
      subEl.textContent = 'IGNITE THE EXACT MIRROR REFLECTION ON THE RIGHT';
      setupStage4();
      spawnBurst(width / 2, height / 2, 90, '#d8b4e2');
      } else if (stage === 5) {
      stageTimeLeft = 15.0;
      timerActive = true;
      numEl.textContent = 'V / VII';
      titleEl.textContent = 'CHRONO ASTROLABE';
      subEl.textContent = 'ALIGN ALL 3 RINGS WITH THE TOP AXIS';
      initStage5();
      spawnBurst(width / 2, height / 2, 90, '#eac38b');
      } else if (stage === 6) {
      stageTimeLeft = 12.0;
      timerActive = true;
      numEl.textContent = 'VI / VII';
      titleEl.textContent = 'MAKE A WISH';
      subEl.textContent = 'BLOW OUT ALL 5 CANDLES BEFORE THEY RELIGHT';
      setupStage6();
      spawnBurst(width / 2, height / 2, 110, '#ffd6e0');
      } else if (stage === 7) {
      timerActive = false;
      timerEl.style.opacity = '0';
      document.getElementById('questPrompt').style.opacity = '0';
      document.getElementById('finaleBox').style.display = 'block';
      playFullHBD();
      spawnBurst(width / 2, height / 2, 180);
      setTimeout(() => spawnBurst(width * 0.25, height * 0.3, 120), 500);
      setTimeout(() => spawnBurst(width * 0.75, height * 0.3, 120), 1000);
      setInterval(() => {
      spawnBurst(
      width * (0.15 + Math.random() * 0.7),
      height * (0.15 + Math.random() * 0.45),
      100
      );
      }, 2000);
      }
      }
      setStage(1);
      // ==========================================
      // POINTER INTERACTIONS
      // ==========================================
      window.addEventListener('pointerdown', (e) => {
      initAudio();
      const x = e.clientX;
      const y = e.clientY;
      for (let i = 0; i < 6; i++) {
      sparks.push(new Spark(x, y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#eac38b', 1.5, 4));
      }
      // Stage 1: Smallest to Largest
      if (stage === 1) {
      starsStage1.forEach((s) => {
      if (!s.lit && Math.hypot(x - s.x, y - s.y) < 55) {
      if (s.rank === nextExpectedRank) {
      s.lit = true;
      playChime(nextExpectedRank - 1);
      spawnBurst(s.x, s.y, 40, '#eac38b');
      nextExpectedRank++;
      } else {
      playErrorTone();
      spawnBurst(s.x, s.y, 30, '#ff4d6d');
      starsStage1.forEach(st => st.lit = false);
      nextExpectedRank = 1;
      }
      }
      });
      if (nextExpectedRank > starsStage1.length) {
      timerActive = false;
      setTimeout(() => setStage(2), 600);
      }
      }
      // Stage 3: Memory Echo input
      else if (stage === 3 && !isShowingSequence) {
      memoryPads.forEach(pad => {
      if (Math.hypot(x - pad.x, y - pad.y) < 55) {
      activePadIndex = pad.id;
      setTimeout(() => { activePadIndex = -1; }, 220);
      if (pad.id === memorySequence.at(playerStep)) {
      playTone(pad.freq, 0.45, 'sine', 0.18);
      spawnBurst(pad.x, pad.y, 28, pad.color);
      playerStep++;
      if (playerStep === memorySequence.length) {
      isShowingSequence = true;
      timerActive = false;
      setTimeout(() => setStage(4), 650);
      }
      } else {
      playErrorTone();
      spawnBurst(pad.x, pad.y, 25, '#ff4d6d');
      setTimeout(() => playMemorySequence(), 650);
      }
      }
      });
      }
      // Stage 4: Mirror Symmetry click
      else if (stage === 4) {
      if (x > width / 2 + 15) {
      let hitAny = false;
      rightTargets.forEach((target) => {
      if (!target.lit && Math.hypot(x - target.x, y - target.y) < 62) {
      target.lit = true;
      hitAny = true;
      playChime(target.index);
      spawnBurst(target.x, target.y, 45, '#eac38b');
      }
      });
      if (!hitAny) {
      playErrorTone();
      stageTimeLeft = Math.max(0.5, stageTimeLeft - 1.0);
      spawnBurst(x, y, 20, '#ff4d6d');
      }
      if (rightTargets.every(t => t.lit)) {
      timerActive = false;
      setTimeout(() => setStage(5), 650);
      }
      }
      }
      // Stage 5: Lock Astrolabe Ring
      else if (stage === 5 && currentRingIdx < rings.length) {
      const r = rings.at(currentRingIdx);
      let normAngle = ((r.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const target = Math.PI * 1.5;
      let diff = Math.abs(normAngle - target);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.28) {
      r.locked = true;
      r.angle = target;
      playChime(currentRingIdx * 2);
      spawnBurst(width / 2, height / 2 - r.radius, 45, r.color);
      currentRingIdx++;
      if (currentRingIdx === rings.length) {
      timerActive = false;
      setTimeout(() => setStage(6), 700);
      }
      } else {
      playErrorTone();
      spawnBurst(x, y, 20, '#ff4d6d');
      }
      }
      // Stage 6: Blow out the 5 cake candles
      else if (stage === 6) {
      let allOut = true;
      candles.forEach(c => {
      if (c.flamePower > 0) {
      if (Math.hypot(x - c.x, y - (c.y - 25)) < 45) {
      c.flamePower = Math.max(0, c.flamePower - 0.55);
      playBlowSound();
      for (let s = 0; s < 5; s++) {
      smokeParticles.push(new Smoke(c.x, c.y - 22));
      }
      if (c.flamePower === 0) {
      spawnBurst(c.x, c.y - 25, 25, '#fff6eb');
      }
      }
      }
      if (c.flamePower > 0) allOut = false;
      });
      if (allOut) {
      timerActive = false;
      setTimeout(() => setStage(7), 750);
      }
      }
      // Stage 7: Finale fireworks
      else if (stage === 7) {
      spawnBurst(x, y, 90);
      }
      });
      window.addEventListener('pointermove', (e) => {
      if (Math.random() > 0.45) {
      sparks.push(new Spark(e.clientX, e.clientY, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, '#eac38b', 1.3, 4));
      }
      });
      document.getElementById('replayBtn').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      playFullHBD();
      spawnBurst(width / 2, height / 2, 130);
      });
      // ==========================================
      // DRAW CAKE HELPER (STAGE 6)
      // ==========================================
      function drawAestheticCake() {
      const cx = width / 2;
      const cy = height / 2 + 20;
      ctx.save();
      ctx.strokeStyle = '#eac38b';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#eac38b';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 55, 145, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      const gradBottom = ctx.createLinearGradient(cx - 115, cy, cx + 115, cy);
      gradBottom.addColorStop(0, 'rgba(234, 195, 139, 0.12)');
      gradBottom.addColorStop(0.5, 'rgba(244, 151, 182, 0.25)');
      gradBottom.addColorStop(1, 'rgba(234, 195, 139, 0.12)');
      ctx.fillStyle = gradBottom;
      ctx.strokeStyle = 'rgba(234, 195, 139, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 42, 115, 18, 0, 0, Math.PI);
      ctx.lineTo(cx - 115, cy - 10);
      ctx.ellipse(cx, cy - 10, 115, 18, 0, Math.PI, 0, true);
      ctx.lineTo(cx + 115, cy + 42);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 115, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      const gradTop = ctx.createLinearGradient(cx - 85, cy - 55, cx + 85, cy - 55);
      gradTop.addColorStop(0, 'rgba(255, 246, 235, 0.15)');
      gradTop.addColorStop(0.5, 'rgba(234, 195, 139, 0.32)');
      gradTop.addColorStop(1, 'rgba(255, 246, 235, 0.15)');
      ctx.fillStyle = gradTop;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 12, 85, 14, 0, 0, Math.PI);
      ctx.lineTo(cx - 85, cy - 58);
      ctx.ellipse(cx, cy - 58, 85, 14, 0, Math.PI, 0, true);
      ctx.lineTo(cx + 85, cy - 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(244, 151, 182, 0.22)';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 58, 85, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      candles.forEach(c => {
      if (c.flamePower > 0 && c.flamePower < 1) {
      c.flamePower = Math.min(1, c.flamePower + 0.0045);
      }
      ctx.strokeStyle = '#fff6eb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + 30);
      ctx.lineTo(c.x, c.y - 10);
      ctx.stroke();
      ctx.strokeStyle = '#eac38b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 10);
      ctx.lineTo(c.x, c.y - 16);
      ctx.stroke();
      if (c.flamePower > 0) {
      const flicker = Math.sin(time * 18 + c.phase) * 2.5;
      const scale = c.flamePower;
      const fx = c.x + flicker * 0.5;
      const fy = c.y - 28;
      const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, 26 * scale);
      glow.addColorStop(0, 'rgba(255, 246, 235, 0.95)');
      glow.addColorStop(0.4, 'rgba(234, 195, 139, 0.55)');
      glow.addColorStop(1, 'rgba(244, 151, 182, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy, 26 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6eb';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 4.5 * scale, 11 * scale, flicker * 0.04, 0, Math.PI * 2);
      ctx.fill();
      }
      });
      ctx.restore();
      }
      // ==========================================
      // MAIN ANIMATION LOOP
      // ==========================================
      function animate(now) {
      const dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      time += 0.015;
      // HARDCORE TIMER: RESET TO STAGE 1 ON TIMEOUT
      if (timerActive && stage < 7) {
      stageTimeLeft -= dt;
      const timerEl = document.getElementById('timerDisplay');
      if (stageTimeLeft <= 4.0) {
      timerEl.classList.add('danger');
      } else {
      timerEl.classList.remove('danger');
      }
      if (stageTimeLeft <= 0) {
      playErrorTone();
      spawnBurst(width / 2, height / 2, 110, '#ff4d6d');
      setStage(1);
      } else {
      timerEl.textContent = stageTimeLeft.toFixed(1) + 's';
      }
      }
      ctx.fillStyle = 'rgba(4, 2, 7, 0.25)';
      ctx.fillRect(0, 0, width, height);
      // --- STAGE 1: HIERARCHY BY SIZE ---
      if (stage === 1) {
      starsStage1.forEach(s => {
      s.x = s.baseX + Math.cos(time + s.phase) * 12;
      s.y = s.baseY + Math.sin(time * 1.1 + s.phase) * 12;
      });
      const lit = starsStage1.filter(s => s.lit).sort((a, b) => a.rank - b.rank);
      if (lit.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 195, 139, 0.75)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#eac38b';
      ctx.beginPath();
      const first = lit.at(0);
      ctx.moveTo(first.x, first.y);
      lit.forEach((st, idx) => {
      if (idx > 0) ctx.lineTo(st.x, st.y);
      });
      ctx.stroke();
      ctx.restore();
      }
      starsStage1.forEach(s => {
      ctx.save();
      ctx.fillStyle = s.lit ? '#fff6eb' : 'rgba(234, 195, 139, 0.55)';
      ctx.shadowBlur = s.lit ? 25 : 12;
      ctx.shadowColor = s.lit ? '#eac38b' : '#f497b6';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      if (s.lit) {
      ctx.strokeStyle = '#eac38b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      }
      ctx.restore();
      });
      }
      // --- STAGE 2: BEACON CIPHER ---
      if (stage === 2) {
      beaconGlow = Math.max(0, beaconGlow - 0.045);
      const bx = width / 2;
      const by = height * 0.24;
      ctx.save();
      const r = 16 + beaconGlow * 26;
      const grad = ctx.createRadialGradient(bx, by, 2, bx, by, r * 2.2);
      grad.addColorStop(0, 'rgba(255, 246, 235, ' + (0.35 + beaconGlow * 0.65) + ')');
      grad.addColorStop(0.5, 'rgba(234, 195, 139, ' + (0.15 + beaconGlow * 0.45) + ')');
      grad.addColorStop(1, 'rgba(234, 195, 139, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = beaconGlow > 0.2 ? '#ffffff' : 'rgba(234, 195, 139, 0.35)';
      ctx.beginPath();
      ctx.arc(bx, by, 10 + beaconGlow * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      }
      // --- STAGE 3: MEMORY ECHO ---
      if (stage === 3) {
      memoryPads.forEach(pad => {
      const isLit = activePadIndex === pad.id;
      ctx.save();
      ctx.fillStyle = isLit ? '#ffffff' : pad.color;
      ctx.globalAlpha = isLit ? 1 : 0.35;
      ctx.shadowBlur = isLit ? 35 : 12;
      ctx.shadowColor = pad.color;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, isLit ? 26 : 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pad.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      });
      }
      // --- STAGE 4: MIRROR SYMMETRY ---
      if (stage === 4) {
      const cx = width / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 195, 139, 0.35)';
      ctx.setLineDash(new Array(6, 8));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, height * 0.2);
      ctx.lineTo(cx, height * 0.8);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(244, 151, 182, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const lFirst = leftConstellation.at(0);
      ctx.moveTo(lFirst.x, lFirst.y);
      leftConstellation.forEach((pt, idx) => {
      if (idx > 0) ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      leftConstellation.forEach(pt => {
      ctx.fillStyle = '#f497b6';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f497b6';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      });
      ctx.restore();
      rightTargets.forEach((pt, idx) => {
      if (!pt.lit) {
      ctx.save();
      const glimmer = 0.08 + Math.abs(Math.sin(time * 2.5 + idx)) * 0.12;
      ctx.fillStyle = 'rgba(234, 195, 139, ' + glimmer + ')';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      }
      });
      const litRight = rightTargets.filter(t => t.lit);
      if (litRight.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 195, 139, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const rFirst = litRight.at(0);
      ctx.moveTo(rFirst.x, rFirst.y);
      litRight.forEach((pt, idx) => {
      if (idx > 0) ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
      }
      litRight.forEach(pt => {
      ctx.save();
      ctx.fillStyle = '#fff6eb';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#eac38b';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      });
      }
      // --- STAGE 5: ASTROLABE RINGS ---
      if (stage === 5) {
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.strokeStyle = '#fff6eb';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#eac38b';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 180);
      ctx.lineTo(cx, cy - 55);
      ctx.stroke();
      ctx.restore();
      rings.forEach((r, idx) => {
      if (!r.locked) r.angle += r.speed;
      ctx.save();
      ctx.strokeStyle = r.locked ? '#fff6eb' : r.color;
      ctx.globalAlpha = idx === currentRingIdx || r.locked ? 0.95 : 0.35;
      ctx.lineWidth = r.locked ? 4 : 3;
      ctx.shadowBlur = idx === currentRingIdx ? 18 : 6;
      ctx.shadowColor = r.color;
      const gapSize = 0.32;
      ctx.beginPath();
      ctx.arc(cx, cy, r.radius, r.angle + gapSize, r.angle + Math.PI * 2 - gapSize);
      ctx.stroke();
      ctx.restore();
      });
      }
      // --- STAGE 6: BIRTHDAY CAKE & CANDLES ---
      if (stage === 6) {
      drawAestheticCake();
      }
      // --- STAGE 7: 3D LOTUS FINALE ---
      if (stage === 7) {
      const cx = width / 2;
      const cy = height / 2;
      const fov = 450;
      const rotY = time * 0.55;
      const rotX = Math.sin(time * 0.35) * 0.25;
      points3D.forEach(p => {
      p.x += (p.fx - p.x) * 0.06;
      p.y += (p.fy - p.y) * 0.06;
      p.z += (p.fz - p.z) * 0.06;
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const x1 = p.x * cosY - p.z * sinY;
      const z1 = p.z * cosY + p.x * sinY;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const y2 = p.y * cosX - z1 * sinX;
      const z2 = z1 * cosX + p.y * sinX;
      const scale = fov / (fov + z2 + 240);
      if (scale > 0) {
      const sx = cx + x1 * scale;
      const sy = cy + y2 * scale;
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0.15, scale * 0.9));
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      }
      });
      }
      smokeParticles = smokeParticles.filter(sm => {
      sm.update();
      sm.draw();
      return sm.alpha > 0;
      });
      shockwaves = shockwaves.filter(w => {
      w.update();
      w.draw();
      return w.alpha > 0;
      });
      sparks = sparks.filter(s => {
      s.update();
      s.draw();
      return s.alpha > 0;
      });
      requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);