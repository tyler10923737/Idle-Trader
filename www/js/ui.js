// UI helpers: DOM, toast, bottom sheet, modal, coin effects and tiny synthesized sounds.
import { icon } from "./art.js";

export const $ = sel => document.querySelector(sel);
export const $$ = sel => Array.from(document.querySelectorAll(sel));
export const el = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- preferences (sound etc.) ----------
const PREF_KEY = "idleTraderPrefs";
export const prefs = (() => { try { return { sound: true, notifications: true, haptics: true, ...(JSON.parse(localStorage.getItem(PREF_KEY) || "{}")) }; } catch (e) { return { sound: true, notifications: true, haptics: true }; } })();
export function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }
export function applyTheme(id) {
  const root = document.documentElement;
  if (!id || id === "ocean") root.removeAttribute("data-theme"); else root.dataset.theme = id;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = getComputedStyle(root).getPropertyValue("--nav1").trim() || "#1b2a7a";
}
applyTheme(prefs.theme);

// ---------- sound (WebAudio, no asset files) ----------
let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
function tone(freq, dur = 0.08, type = "sine", vol = 0.12, delay = 0) {
  if (!prefs.sound) return;
  const c = ac(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* ignore */ }
}
export const sfx = {
  tap: () => tone(520, 0.05, "triangle", 0.06),
  coin: () => { tone(880, 0.08, "sine", 0.1); tone(1320, 0.14, "sine", 0.1, 0.07); },
  buy: () => { tone(523, 0.08, "triangle", 0.1); tone(659, 0.08, "triangle", 0.1, 0.08); tone(784, 0.18, "triangle", 0.1, 0.16); },
  success: () => { tone(659, 0.1, "sine", 0.1); tone(880, 0.1, "sine", 0.1, 0.1); tone(1175, 0.25, "sine", 0.1, 0.2); },
  fail: () => tone(170, 0.16, "sawtooth", 0.05),
  whoosh: () => tone(320, 0.1, "sine", 0.04),
  prestige: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, "triangle", 0.09, i * 0.09))
};
document.addEventListener("pointerdown", () => ac(), { once: true, passive: true });

// ---------- toast ----------
let toastTimer = null;
export function toast(msg, kind = "") {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.className = "toast show " + kind;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

// ---------- effects ----------
export function bump(e) { if (!e) return; e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }
export function pop(e) { if (!e) return; e.classList.remove("pop-anim"); void e.offsetWidth; e.classList.add("pop-anim"); }
const COIN = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#ffb400"/><circle cx="12" cy="12" r="8" fill="#ffd86b"/><path d="M12 7v10M9.5 9.5h3.5a1.8 1.8 0 0 1 0 3.6H11a1.8 1.8 0 0 0 0 3.6h3.5" stroke="#b36b00" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
export function coinBurst(fromEl, count = 10, toSel = "#cash") {
  const layer = $("#fx"); if (!layer || !fromEl) return;
  const r = fromEl.getBoundingClientRect(), tgt = $(toSel)?.getBoundingClientRect() || r;
  const sx = r.left + r.width / 2, sy = r.top + r.height / 2, tx = tgt.left + tgt.width / 2, ty = tgt.top + tgt.height / 2;
  for (let i = 0; i < count; i++) {
    const c = document.createElement("i"); c.className = "coin"; c.innerHTML = COIN; c.style.left = sx + "px"; c.style.top = sy + "px"; layer.appendChild(c);
    const a = Math.random() * Math.PI * 2, d = 36 + Math.random() * 70;
    const mx = Math.cos(a) * d, my = Math.sin(a) * d - 50;
    const anim = c.animate([
      { transform: "translate(-50%,-50%) scale(.3)", opacity: 1 },
      { transform: `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) scale(1)`, opacity: 1, offset: 0.4 },
      { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(.45)`, opacity: 0.9 }
    ], { duration: 700 + Math.random() * 300, easing: "cubic-bezier(.3,.6,.3,1)", delay: i * 28 });
    anim.onfinish = () => { c.remove(); if (i === count - 1) bump($(toSel)); };
  }
}
export function confetti(n = 26) {
  const layer = $("#fx"); if (!layer) return;
  const colors = ["#ffd23f", "#ff5c7a", "#4fd3ff", "#2ee6a6", "#9b5cff", "#ffffff"];
  const W = window.innerWidth, H = window.innerHeight;
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i"); c.className = "confetti"; c.style.background = colors[i % colors.length];
    const x = Math.random() * W; c.style.left = x + "px"; c.style.top = "-10px"; layer.appendChild(c);
    c.animate([{ transform: "translateY(0) rotate(0)", opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 160}px, ${H + 40}px) rotate(${Math.random() * 720}deg)`, opacity: 0.9 }],
      { duration: 1500 + Math.random() * 1200, easing: "cubic-bezier(.2,.6,.4,1)", delay: Math.random() * 300 }).onfinish = () => c.remove();
  }
}

// ---------- bottom sheet ----------
let currentSheet = null;
export function openSheet({ title, subtitle = "", body = "", onUpdate = null, onClose = null, cls = "" }) {
  closeSheet();
  const wrap = el(`<div class="sheet-backdrop"><div class="sheet ${cls}" role="dialog" aria-label="${esc(title)}"><div class="sheet-handle"></div><header class="sheet-head"><div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div><button class="icon-btn sheet-close" aria-label="Close">${icon("close")}</button></header><div class="sheet-body"></div></div></div>`);
  const bodyEl = wrap.querySelector(".sheet-body");
  if (typeof body === "string") bodyEl.innerHTML = body; else bodyEl.appendChild(body);
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("open"));
  const handle = { el: wrap, body: bodyEl, onUpdate, close: () => { if (currentSheet !== handle) return; wrap.classList.remove("open"); setTimeout(() => wrap.remove(), 260); currentSheet = null; onClose && onClose(); } };
  wrap.addEventListener("click", e => { if (e.target === wrap) handle.close(); });
  wrap.querySelector(".sheet-close").addEventListener("click", handle.close);
  currentSheet = handle;
  return handle;
}
export function closeSheet() { if (currentSheet) currentSheet.close(); }
export const isSheetOpen = () => !!currentSheet;
export function updateSheet(state) { if (currentSheet && currentSheet.onUpdate) currentSheet.onUpdate(state, currentSheet); }
export function sheetOpen() { return !!currentSheet; }

// ---------- modal (confirm / info) — queued, one at a time ----------
const modalQueue = []; let modalOpen = false;
export const isModalOpen = () => modalOpen;
export function modal(opts) {
  return new Promise(resolve => { modalQueue.push({ opts, resolve }); if (!modalOpen) showNextModal(); });
}
function showNextModal() {
  const next = modalQueue.shift(); if (!next) { modalOpen = false; return; }
  modalOpen = true;
  const { title, text = "", html = "", ok = "OK", cancel = null, iconName = "info", tone: toneCls = "" } = next.opts;
  const m = el(`<div class="modal-backdrop"><div class="modal ${toneCls}"><div class="modal-icon">${icon(iconName)}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}${html}<div class="modal-actions">${cancel ? `<button class="btn btn-ghost" data-act="cancel">${esc(cancel)}</button>` : ""}<button class="btn btn-gold" data-act="ok">${esc(ok)}</button></div></div></div>`);
  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add("open"));
  const done = v => { m.classList.remove("open"); setTimeout(() => { m.remove(); showNextModal(); }, 220); next.resolve(v); };
  m.querySelector("[data-act=ok]").addEventListener("click", () => done(true));
  const c = m.querySelector("[data-act=cancel]"); if (c) c.addEventListener("click", () => done(false));
  m.addEventListener("click", e => { if (e.target === m && cancel) done(false); });
}
