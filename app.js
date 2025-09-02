// =========================
// Elements
// =========================
const input       = document.getElementById("letter-input");
const nameInput   = document.getElementById("name-input");
const startScreen = document.getElementById("start-screen");
const gameScreen  = document.getElementById("game-screen");
const randomBtn   = document.getElementById("random-letter");

const canvas = document.getElementById("game");
const ctx    = canvas.getContext("2d");

// =========================
// Config / Colors
// =========================
const BG_COLOR   = "#7e2d86";
const PIXEL_COLOR = "#c6ff4d";
const PIXEL_GAP   = 1;
const PAD_CELLS   = 2;

// =========================
/* State */
// =========================
let pixelGrid   = null;   // boolean [rows][cols]
let gridMeta    = null;   // {rows, cols, cellSize, offsetX, offsetY}
let chosenLetter = null;

let animationId = null;
let lastTime    = 0;

let totalBites  = 0;
let eaten       = 0;

let timeLeft    = 15;     // seconds
let gameOver    = false;  // true when time up OR win
let won         = false;  // true when all pixels eaten
let spokeWin    = false;  // TTS once
let playerName  = "";     // from #name-input
let paused      = false;  // SPACE toggles

// =========================
/* Input for smooth movement (without blocking typing) */
// =========================
const keys = new Set();

function isTypingTarget(el) {
  const tag = (el?.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || el?.isContentEditable;
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const isMoveKey = ["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k);

  if (isMoveKey && !isTypingTarget(e.target)) {
    e.preventDefault();
    keys.add(k);
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

// SPACE = pause
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !isTypingTarget(e.target)) {
    e.preventDefault();
    paused = !paused;
  }
});

// =========================
/* Font (5x7). 
   If you have your own big matrices for some letters, you can merge them here.
*/
const FONT_5x7 = {
  "A": [
    ".###.",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
  ],
  "B": [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#...#",
    "#...#",
    "####.",
  ],
  "C": [
    ".####",
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    ".####",
  ],
  "D": [
    "####.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "####.",
  ],
  "E": [
    "#####",
    "#....",
    "#....",
    "####.",
    "#....",
    "#....",
    "#####",
  ],
  "F": [
    "#####",
    "#....",
    "#....",
    "####.",
    "#....",
    "#....",
    "#....",
  ],
  "G": [
    ".####",
    "#....",
    "#....",
    "#.###",
    "#...#",
    "#...#",
    ".###.",
  ],
  "H": [
    "#...#",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
  ],
  "I": [
    "#####",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "#####",
  ],
  "J": [
    "#####",
    "...#.",
    "...#.",
    "...#.",
    "...#.",
    "#..#.",
    ".##..",
  ],
  "K": [
    "#...#",
    "#..#.",
    "#.#..",
    "##...",
    "#.#..",
    "#..#.",
    "#...#",
  ],
  "L": [
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#####",
  ],
  "M": [
    "#...#",
    "##.##",
    "#.#.#",
    "#.#.#",
    "#...#",
    "#...#",
    "#...#",
  ],
  "N": [
    "#...#",
    "##..#",
    "#.#.#",
    "#..##",
    "#..##",
    "#...#",
    "#...#",
  ],
  "O": [
    ".###.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".###.",
  ],
  "P": [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#....",
    "#....",
    "#....",
  ],
  "Q": [
    ".###.",
    "#...#",
    "#...#",
    "#...#",
    "#.#.#",
    "#..#.",
    ".##.#",
  ],
  "R": [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#.#..",
    "#..#.",
    "#...#",
  ],
  "S": [
    ".####",
    "#....",
    "#....",
    ".###.",
    "....#",
    "....#",
    "####.",
  ],
  "T": [
    "#####",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
  ],
  "U": [
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".###.",
  ],
  "V": [
    "#...#",
    "#...#",
    "#...#",
    ".#.#.",
    ".#.#.",
    "..#..",
    "..#..",
  ],
  "W": [
    "#...#",
    "#...#",
    "#...#",
    "#.#.#",
    "#.#.#",
    "##.##",
    "#...#",
  ],
  "X": [
    "#...#",
    ".#.#.",
    "..#..",
    "..#..",
    "..#..",
    ".#.#.",
    "#...#",
  ],
  "Y": [
    "#...#",
    ".#.#.",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
  ],
  "Z": [
    "#####",
    "....#",
    "...#.",
    "..#..",
    ".#...",
    "#....",
    "#####",
  ],
};

// fallback: hollow box if letter missing
function fallbackMatrix() {
  const rows = 7, cols = 5;
  const m = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const edge = (r===0 || r===rows-1 || c===0 || c===cols-1);
      line += edge ? "#" : ".";
    }
    m.push(line);
  }
  return m;
}

// =========================
// Grid helpers
// =========================
function toBoolGrid(matrix) {
  const rows = matrix.length, cols = matrix[0].length;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) grid[r][c] = (matrix[r][c] === "#" || matrix[r][c] === "1");
  }
  return grid;
}

function scaleMatrixToBoard(smallGrid) {
  const srcRows = smallGrid.length, srcCols = smallGrid[0].length;

  // total cells incl. padding
  const targetCols = srcCols + PAD_CELLS * 2;
  const targetRows = srcRows + PAD_CELLS * 2;

  const cellSize = Math.floor(Math.min(canvas.width / targetCols, canvas.height / targetRows));

  // final grid size (integer fit)
  const finalCols = Math.floor(canvas.width / cellSize);
  const finalRows = Math.floor(canvas.height / cellSize);

  // center as pixels
  const totalW = finalCols * cellSize;
  const totalH = finalRows * cellSize;
  const offsetX = Math.floor((canvas.width  - totalW) / 2);
  const offsetY = Math.floor((canvas.height - totalH) / 2);

  // drawable area in cells after padding
  const areaCols = finalCols - PAD_CELLS * 2;
  const areaRows = finalRows - PAD_CELLS * 2;

  // scale factor
  const sx = areaCols / srcCols;
  const sy = areaRows / srcRows;
  const s = Math.min(sx, sy);

  const occCols = Math.floor(srcCols * s);
  const occRows = Math.floor(srcRows * s);

  // center inside grid
  const startCol = Math.floor((finalCols - occCols) / 2);
  const startRow = Math.floor((finalRows - occRows) / 2);

  // build scaled grid via nearest-neighbor
  const grid = Array.from({ length: finalRows }, () => Array(finalCols).fill(false));
  for (let r = 0; r < occRows; r++) {
    for (let c = 0; c < occCols; c++) {
      const srcR = Math.min(srcRows - 1, Math.floor(r / s));
      const srcC = Math.min(srcCols - 1, Math.floor(c / s));
      grid[startRow + r][startCol + c] = smallGrid[srcR][srcC];
    }
  }

  return { grid, meta: { rows: finalRows, cols: finalCols, cellSize, offsetX, offsetY } };
}

// =========================
/* Web Audio SFX (no files) */
// =========================
let audioCtx = null;
let isMuted = false;
let masterGain = 0.35;
let chompCooldown = 0;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function tone(freq=440, dur=0.08, type="sine", vol=1, slideTo=null) {
  if (!audioCtx || isMuted) return;
  const t0 = audioCtx.currentTime;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol * masterGain, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

function sfxStart(){ tone(880,0.08,"square",0.7); setTimeout(()=>tone(1175,0.06,"square",0.6),60); }
function sfxChomp(){
  const now = performance.now();
  if (now < chompCooldown) return;
  chompCooldown = now + 55;
  tone(900,0.06,"sawtooth",0.8,520);
}
function sfxWin(){ tone(660,0.10,"triangle",0.9); setTimeout(()=>tone(880,0.10,"triangle",0.9),110); setTimeout(()=>tone(1175,0.14,"triangle",1.0),220); }
function sfxTimeUp(){ tone(220,0.22,"square",0.7,120); }

window.addEventListener("pointerdown", ensureAudio, { once:true });
window.addEventListener("keydown", ensureAudio, { once:true });
window.addEventListener("keydown", (e)=>{ if (e.key.toLowerCase()==="m") isMuted = !isMuted; });

// =========================
/* TTS + Speech bubble */
// =========================
function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0; utt.pitch = 1.0; utt.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find(v => /en-/i.test(v.lang)) || voices[0];
    if (en) utt.voice = en;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  } catch {}
}
window.speechSynthesis?.getVoices?.(); // warm-up

function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y,   x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x,   y+h, rr);
  ctx.arcTo(x,   y+h, x,   y,   rr);
  ctx.arcTo(x,   y,   x+w, y,   rr);
  ctx.closePath();
}

function drawSpeechBubble(text, targetX, targetY) {
  const { offsetX, offsetY, cols, rows, cellSize } = gridMeta;
  const boardRight  = offsetX + cols * cellSize;
  const boardBottom = offsetY + rows * cellSize;

  ctx.font = "bold 28px 'Pixelify Sans', monospace";
  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const padX = 14;
  const bubbleW = Math.ceil(textW + padX * 2);
  const bubbleH = 44;

  // prefer above-right of Pac
  let bx = targetX + 24;
  let by = targetY - bubbleH - 24;

  // clamp
  bx = Math.max(offsetX + 8, Math.min(boardRight  - bubbleW - 8, bx));
  by = Math.max(offsetY + 8, Math.min(boardBottom - bubbleH - 8, by));

  // bubble
  ctx.save();
  roundedRectPath(ctx, bx, by, bubbleW, bubbleH, 10);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#111";
  ctx.stroke();

  // tail
  const tailBaseX = Math.min(Math.max(targetX, bx + 12), bx + bubbleW - 12);
  const tailTop = (targetY < by) ? by : (by + bubbleH);
  const sign = (targetY < by) ? -1 : 1;

  ctx.beginPath();
  ctx.moveTo(tailBaseX - 10, tailTop);
  ctx.lineTo(tailBaseX + 10, tailTop);
  ctx.lineTo(targetX, targetY + sign * 4);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.stroke();

  // text
  ctx.fillStyle = "#111";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + padX, by + bubbleH / 2);
  ctx.restore();
}

// =========================
/* Pac-Man entity */
// =========================
class Pacman {
  constructor(x, y, r, speed) {
    this.x = x; this.y = y; this.r = r; this.speed = speed;
    this.dx = 1; this.dy = 0;
    this.mouthPhase = 0;
  }
  update(dt) {
    let vx = 0, vy = 0;
    if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
    if (keys.has("arrowright")|| keys.has("d")) vx += 1;
    if (keys.has("arrowup")   || keys.has("w")) vy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) vy += 1;

    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      vx/=len; vy/=len;
      this.dx = vx; this.dy = vy;
    }
    this.x += vx * this.speed * dt;
    this.y += vy * this.speed * dt;

    const left   = gridMeta.offsetX + this.r + 2;
    const top    = gridMeta.offsetY + this.r + 2;
    const right  = gridMeta.offsetX + gridMeta.cols * gridMeta.cellSize - this.r - 2;
    const bottom = gridMeta.offsetY + gridMeta.rows * gridMeta.cellSize - this.r - 2;

    this.x = Math.max(left, Math.min(right,  this.x));
    this.y = Math.max(top,  Math.min(bottom, this.y));

    this.mouthPhase += dt * 8;
  }
  draw(ctx) {
    const minOpen = 0.08 * Math.PI;
    const maxOpen = 0.28 * Math.PI;
    const openNow = minOpen + Math.abs(Math.sin(this.mouthPhase)) * (maxOpen - minOpen);
    const angle = Math.atan2(this.dy, this.dx);
    const start = angle + openNow;
    const end   = angle - openNow;

    ctx.fillStyle = "#FFD54A";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, this.r, start, end, false);
    ctx.closePath();
    ctx.fill();

    // eye
    const eyeDist = this.r * 0.45;
    const eyeAngle = angle - Math.PI / 2;
    const eyeX = this.x + Math.cos(eyeAngle) * eyeDist;
    const eyeY = this.y + Math.sin(eyeAngle) * eyeDist;
    ctx.beginPath();
    ctx.fillStyle = "#111";
    ctx.arc(eyeX, eyeY, this.r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}
let pac = null;

// =========================
/* Game logic */
// =========================
function eatIfOnCell() {
  const { cellSize, offsetX, offsetY, rows, cols } = gridMeta;
  const gx = Math.floor((pac.x - offsetX) / cellSize);
  const gy = Math.floor((pac.y - offsetY) / cellSize);
  if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;

  if (pixelGrid[gy][gx]) {
    pixelGrid[gy][gx] = false;
    eaten += 1;
    sfxChomp();
  }
}

function drawAll() {
  // board
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // inner border
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 4;
  const { rows, cols, cellSize, offsetX, offsetY } = gridMeta;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  // grid pixels
  ctx.fillStyle = PIXEL_COLOR;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!pixelGrid[r][c]) continue;
      const x = offsetX + c * cellSize + PIXEL_GAP;
      const y = offsetY + r * cellSize + PIXEL_GAP;
      const size = cellSize - PIXEL_GAP * 2;
      if (size > 0) ctx.fillRect(x, y, size, size);
    }
  }

  // pacman
  if (pac) pac.draw(ctx);

  // HUD: score
  ctx.fillStyle = "#c6ff4d";
  ctx.font = "bold 20px 'Pixelify Sans', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Score: ${eaten}/${totalBites}`, 14, 14);

  // HUD: timer
  const boardRight = offsetX + cols * cellSize;
  ctx.fillStyle = "#ff6b6b";
  ctx.textAlign = "right";
  ctx.fillText(`Time: ${timeLeft.toFixed(1)}s`, boardRight - 14, offsetY + 14);

  // PAUSED overlay
  if (paused && !gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(offsetX, offsetY, cols * cellSize, rows * cellSize);
    ctx.fillStyle = "#c6ff4d";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 48px 'Pixelify Sans', monospace";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
  }

  // End states
  if (gameOver) {
    if (won) {
      const who = playerName || "Player";
      drawSpeechBubble(`GOOD JOB, ${who}!`, pac.x, pac.y - pac.r - 6);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(offsetX, offsetY, cols * cellSize, rows * cellSize);
      ctx.fillStyle = "#c6ff4d";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 56px 'Pixelify Sans', monospace";
      ctx.fillText("TIME UP!", canvas.width / 2, canvas.height / 2);
    }
  }
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (!gameOver && !paused) {
    if (pac) {
      pac.update(dt);
      eatIfOnCell();
    }

    if (eaten >= totalBites) {
      won = true;
      gameOver = true;
      if (!spokeWin) {
        sfxWin();
        speak(`Good job, ${playerName || "player"}!`);
        spokeWin = true;
      }
    } else {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        gameOver = true;
        sfxTimeUp();
      }
    }
  }

  drawAll();
  animationId = requestAnimationFrame(loop);
}

// =========================
/* Start screen */
// =========================
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") input.focus();
});

input.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  let letter = input.value.trim().toUpperCase();
  playerName = nameInput.value.trim();

  if (!playerName) {
    alert("Please enter your name");
    nameInput.focus();
    return;
  }
  if (!/^[A-Z]$/.test(letter)) {
    alert("Please enter a single letter A–Z");
    input.value = "";
    input.focus();
    return;
  }

  chosenLetter = letter;
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  input.blur();
  initGame(letter);
});

// Random letter button (auto-start)
function getRandomLetter() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[Math.floor(Math.random() * letters.length)];
}
randomBtn.addEventListener("click", () => {
  const nm = nameInput.value.trim();
  if (!nm) {
    alert("Please enter your name");
    nameInput.focus();
    return;
  }
  const letter = getRandomLetter();
  input.value = letter;              // show it
  playerName = nm;
  chosenLetter = letter;
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  input.blur();
  initGame(letter);
});

// =========================
/* Game init (single, correct version) */
// =========================
function initGame(letter) {
  const mat   = FONT_5x7[letter] || fallbackMatrix();
  const small = toBoolGrid(mat);
  const scaled = scaleMatrixToBoard(small);
  pixelGrid = scaled.grid;
  gridMeta  = scaled.meta;

  // count bites
  totalBites = 0; eaten = 0;
  for (let r = 0; r < gridMeta.rows; r++) {
    for (let c = 0; c < gridMeta.cols; c++) if (pixelGrid[r][c]) totalBites++;
  }

  // spawn pacman bottom-left
  const { offsetX, offsetY, cellSize, rows } = gridMeta;
  const pr = Math.max(10, Math.floor(cellSize * 0.42));
  const startX = offsetX + cellSize * 1.5;
  const startY = offsetY + cellSize * (rows - 1.5);
  pac = new Pacman(startX, startY, pr, Math.max(120, cellSize * 6));

  // reset round
  timeLeft = 15;
  gameOver = false;
  won = false;
  spokeWin = false;
  paused = false;

  // audio
  ensureAudio();
  sfxStart();

  // loop
  lastTime = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

// =========================
/* Reviews (Supabase) */
// =========================
const SUPABASE_URL  = "https://YOUR_PROJECT_ID.supabase.co";  // <-- REPLACE
const SUPABASE_ANON = "YOUR_PUBLIC_ANON_KEY";                  // <-- REPLACE
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// DOM for reviews
const form      = document.getElementById("review-form");
const nameEl    = document.getElementById("review-name");
const ratingEl  = document.getElementById("review-rating");
const commentEl = document.getElementById("review-comment");
const listEl    = document.getElementById("reviews-list");
const statusEl  = document.getElementById("review-status");

// keep review name in sync with game name (optional nicety)
try {
  if (nameInput && nameInput.value) nameEl.value = nameInput.value;
  nameInput?.addEventListener("input", () => (nameEl.value = nameInput.value));
} catch {}

function setStatus(msg) {
  statusEl.textContent = msg || "";
  if (msg) setTimeout(() => (statusEl.textContent = ""), 2000);
}

function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function renderReviewCard({ name, rating, comment, created_at }) {
  const dt = new Date(created_at);
  const dateStr = dt.toLocaleString();
  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
  return `
    <div class="review-card">
      <div class="meta">
        <div><strong>${escapeHtml(name)}</strong> — ${stars}</div>
        <div>${escapeHtml(dateStr)}</div>
      </div>
      <div class="comment">${escapeHtml(comment)}</div>
    </div>
  `;
}

async function loadReviews() {
  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Supabase select error:", error);
    setStatus(error.message || "Failed to load reviews.");
    return;
  }
  listEl.innerHTML = (data || []).map(renderReviewCard).join("");
}

async function submitReview(e) {
  e.preventDefault();
  const name    = nameEl.value.trim();
  const rating  = parseInt(ratingEl.value, 10);
  const comment = commentEl.value.trim();

  if (!name || !rating || !comment) { setStatus("Please fill all fields."); return; }
  if (name.length > 40 || comment.length > 500 || rating < 1 || rating > 5) {
    setStatus("Invalid review."); return;
  }

  // optimistic UI
  const temp = { name, rating, comment, created_at: new Date().toISOString() };
  listEl.insertAdjacentHTML("afterbegin", renderReviewCard(temp));

  const { error } = await sb.from("reviews").insert([{ name, rating, comment }]);
  if (error) {
    console.error("Supabase insert error:", error);
    setStatus(error.message || "Could not submit review.");
    await loadReviews(); // revert to server truth
    return;
  }

  setStatus("Thanks for the review!");
  commentEl.value = "";
  ratingEl.value = "";
  await loadReviews(); // show persisted state
}

form.addEventListener("submit", submitReview);

// realtime new reviews
try {
  sb.channel("any")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "reviews" }, (payload) => {
      const r = payload.new;
      listEl.insertAdjacentHTML("afterbegin", renderReviewCard(r));
    })
    .subscribe();
} catch (err) {
  console.warn("Realtime not available:", err);
}

// initial load
loadReviews();
