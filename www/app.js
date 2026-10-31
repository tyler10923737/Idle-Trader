// Idle Trader — app bootstrap: HUD, bottom navigation, scene switching and global events.
import * as E from "./js/economy.js";
import { fmt, timeFmt } from "./js/format.js";
import { DEFS, icon, characterSVG } from "./js/art.js";
import { OUTFITS } from "./js/data.js";
import { $, $$, toast, sfx, modal, updateSheet, closeSheet, bump, confetti, isModalOpen, isSheetOpen } from "./js/ui.js";
import { router } from "./js/router.js";
import { initCloud } from "./js/cloud.js";
import { officeScene } from "./js/scenes/office.js";
import { garageScene } from "./js/scenes/garage.js";
import { propertiesScene, businessScene } from "./js/scenes/collection.js";
import { profileScene } from "./js/scenes/profile.js";
import { openShop } from "./js/scenes/shop.js";
import * as device from "./js/device.js";
import { prefs, savePrefs } from "./js/ui.js";
import * as monetize from "./js/monetize.js";
import { ADS } from "./js/data.js";

const SCENES = [officeScene, garageScene, propertiesScene, businessScene, profileScene];
const byId = Object.fromEntries(SCENES.map(s => [s.id, s]));
let active = null, hud = {}, avatarSig = "";

function buildShell() {
  document.body.insertAdjacentHTML("afterbegin", DEFS);
  const nav = $("#nav");
  nav.innerHTML = SCENES.map(s => `<button class="nav-btn" data-scene="${s.id}" aria-label="${s.label}">${icon(s.iconName)}<span>${s.label}</span></button>`).join("");
  nav.addEventListener("click", e => { const b = e.target.closest("[data-scene]"); if (b) { sfx.tap(); go(b.dataset.scene); } });
  const scenes = $("#scenes");
  SCENES.forEach(s => { const sec = document.createElement("section"); sec.className = "scene"; sec.id = "scene-" + s.id; scenes.appendChild(sec); s.build(sec); });
  hud = { cash: $("#cash"), income: $("#income"), level: $("#hudLevel"), xp: $("#hudXp"), xpFill: $("#xpFill"), badge: $("#lvBadge"), rank: $("#rank"), save: $("#saveStatus"), avatar: $("#hudAvatar"), boost: $("#boostChip"), shop: $("#shopBtn") };
  hud.avatar.addEventListener("click", () => { sfx.tap(); go("profile"); });
  hud.shop.addEventListener("click", () => { sfx.tap(); openShop(); });
  $("#gift").addEventListener("click", async ev => { const b = ev.currentTarget; sfx.tap(); b.disabled = true; try { await monetize.watchRewarded("cash"); bump(hud.cash); } finally { b.disabled = false; } });
}
function go(id, anchor) {
  const next = byId[id]; if (!next) return;
  closeSheet();
  if (active !== next) {
    if (active && active.onHide) active.onHide();
    active = next; router.current = id;
    $$(".scene").forEach(s => s.classList.toggle("active", s.id === "scene-" + id));
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.scene === id));
    next.update(E.getState());
    if (next.onShow) next.onShow();
    const sec = $("#scene-" + id); sec.scrollTop = 0;
    if (anchor) requestAnimationFrame(() => { const t = sec.querySelector("#" + anchor + "Panel") || sec.querySelector("#" + anchor); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
  } else if (anchor) { const t = $("#scene-" + id + " #" + anchor + "Panel"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }
}
router.go = go;

function renderHud(s) {
  hud.cash.textContent = fmt(s.cash);
  hud.income.textContent = "+" + fmt(E.getIncome(s)) + "/sec";
  const next = E.xpToNext(s);
  hud.level.textContent = s.level; hud.badge.textContent = s.level;
  hud.xp.textContent = `${Math.floor(s.xp)} / ${next} XP`;
  hud.xpFill.style.width = Math.min(100, s.xp / next * 100).toFixed(1) + "%";
  hud.rank.textContent = E.rankName(s);
  const left = E.boostRemaining(s);
  hud.boost.hidden = !(left > 0);
  if (left > 0) hud.boost.textContent = `${ADS.boost.mult}× ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
  // free-cash gift (rewarded ad) — shown when its cooldown is over
  const gift = $("#gift");
  if (gift) { const show = monetize.adsAvailable() && E.freeCashIn(s) <= 0; gift.hidden = !show; if (show) gift.querySelector("b").textContent = "+" + fmt(E.freeCashAmount(s)); }
  if (avatarSig !== s.outfit) { avatarSig = s.outfit; const o = OUTFITS.find(x => x.id === s.outfit) || OUTFITS[0]; hud.avatar.innerHTML = characterSVG({ top: o.top, accent: o.accent, pants: o.pants, style: o.style }, "head", "avatar-art"); }
}
function renderAll(s) { renderHud(s); if (active) active.update(s); updateSheet(s); }

// ---- global events ----
E.on("tick", renderAll);
E.on("change", renderAll);
E.on("toast", msg => toast(msg));
E.on("saved", ({ ok }) => { hud.save.textContent = ok ? "● Saved" : "Save unavailable"; hud.save.classList.toggle("bad", !ok); });
E.on("offline", ({ earned, elapsed, pct }) => {
  const ads = monetize.adsAvailable();
  modal({ title: "Welcome back!", html: `<div class="offline-box"><div class="offline-amount">+${fmt(earned)}</div><p>Your empire kept earning for <b>${timeFmt(elapsed)}</b> at ${Math.round(pct * 100)}% efficiency${elapsed >= E.OFFLINE_CAP_SECONDS - 1 ? " (8-hour cap reached)" : ""}. Upgrade <b>Offline Network</b> to earn more while away.</p>${ads ? `<p class="fine">Watch a short ad to <b>double</b> this payout.</p>` : ""}</div>`,
    ok: ads ? `${icon("play")} Double it · watch ad` : "Collect", cancel: ads ? "Collect" : null, iconName: "coin", tone: "gold" })
    .then(async doubled => { sfx.coin(); bump(hud.cash); if (doubled && ads) await monetize.watchRewarded("offline"); monetize.maybeInterstitial(); });
});
E.on("boost", () => bump(hud.boost));
// daily bonus (from the second day on)
E.on("daily", ({ streak, amount }) => {
  const days = Array.from({ length: 7 }, (_, i) => `<i class="${i < Math.min(7, streak) ? "on" : ""}">${i + 1}</i>`).join("");
  modal({ title: "Daily bonus", html: `<div class="level-big">Day ${streak}</div><div class="bonus-box">${icon("coin")}<div><small>TODAY'S BONUS</small><b>+${fmt(amount)}</b></div></div><div class="streak">${days}</div><p class="fine">Come back every day — the bonus grows for 7 days in a row.</p>`, ok: "Collect", iconName: "calendar", tone: "gold" })
    .then(() => { sfx.coin(); bump(hud.cash); device.haptic("success"); });
});
// phone features: haptics on the good moments, reminders while away, the store review prompt at a happy moment
E.on("purchase", () => device.haptic("light"));
E.on("trade:complete", () => device.haptic("light"));
const askReview = () => { if (!device.reviewDue()) return; setTimeout(async () => {
  if (isModalOpen()) { setTimeout(askReview, 2000); return; }
  if (device.isNative()) { await device.requestReview(); return; }
  const yes = await modal({ title: "Enjoying Idle Trader?", text: "A quick rating helps the game find more players. In the app this opens the store's rating box.", ok: "Rate it", cancel: "Not now", iconName: "star", tone: "gold" });
  await device.requestReview(); if (yes) { const url = device.storeUrl(); if (url) device.openUrl(url); else toast("Thanks! Ratings go live with the app store version.", "good"); }
}, 1200); };
E.on("levelup", ({ level }) => { if (level >= 8) askReview(); });
E.on("complete", askReview);
E.on("prestige", askReview);
async function onHide() {
  const s = E.getState();
  await device.cancelNotifications();
  await device.scheduleNotifications(device.planNotifications(s, E.getIncome(s), E.offlinePct(s), fmt));
}
document.addEventListener("visibilitychange", () => { if (document.hidden) onHide(); else device.cancelNotifications(); });
window.addEventListener("pagehide", onHide);
// interstitials: every few minutes of play (ADS.interstitialEverySec) at the next quiet second, or after a real break;
// never on top of a dialog or sheet, never for "Remove ads" owners
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(() => { if (!isModalOpen() && !isSheetOpen()) monetize.maybeInterstitial(); }, 900); });
E.on("tick", s => { if (E.interstitialDue(s) && !isModalOpen() && !isSheetOpen() && !document.querySelector(".ad-overlay")) monetize.maybeInterstitial(); });
E.on("change", () => monetize.syncBanner());
E.on("prestige", () => { go("office"); confetti(); });
E.on("reset", () => { go("office"); });
E.on("purchase", () => bump(hud.xpFill));
E.on("complete", () => {
  sfx.prestige(); confetti(40);
  modal({ title: "Empire complete!", html: `<div class="level-big">100%</div><p>You own one of everything — every car, home and business, right up to the Satellite Network. From here it's about stacking levels, maxing upgrades and prestiging for Legacy Points.</p>`, ok: "Legendary", iconName: "trophy", tone: "gold" });
});
E.on("levelup", ({ level, unlocks, bonus }) => {
  sfx.success(); confetti(18); bump(hud.badge); device.haptic("success");
  if (level === 3 && device.isNative() && prefs.notifications !== false && !prefs.notifAsked) { prefs.notifAsked = true; savePrefs(); setTimeout(() => device.notificationsPermission(), 2500); }
  const nxt = E.nextUnlock(E.getState());
  const list = unlocks.length ? `<div class="unlock-list">${unlocks.map(u => `<div>${icon(u.kind === "car" ? "garage" : u.kind === "property" ? "homes" : u.kind === "business" ? "business" : u.kind === "mentor" ? "profile" : u.kind === "outfit" ? "shirt" : "up")}<span>${u.name}</span></div>`).join("")}</div>` : "";
  const reward = bonus ? `<div class="bonus-box">${icon("coin")}<div><small>LEVEL-UP BONUS</small><b>+${fmt(bonus)}</b></div></div>` : "";
  modal({ title: "Level up!", html: `<div class="level-big">Level ${level}</div>${reward}<p>${unlocks.length ? "New this level:" : "Keep going!"}</p>${list}${nxt ? `<p class="fine">Next unlock at level ${nxt.level}: ${nxt.items.map(i => i.name).join(", ")}</p>` : ""}`, ok: "Awesome", iconName: "medal", tone: "gold" })
    .then(() => { if (bonus) { sfx.coin(); bump(hud.cash); } });
});

// ---- boot ----
buildShell();
go("office");
E.boot();
renderAll(E.getState());
monetize.syncBanner();
setTimeout(() => { if (!isModalOpen() && !isSheetOpen()) monetize.maybeInterstitial(); }, 1500);
// Small debug handle (read-only helpers) for testing from the browser console.
window.IdleTrader = { version: "2.4.0", getState: () => JSON.parse(JSON.stringify(E.getState())), go };
initCloud(text => modal({ title: "Cloud save found", text, ok: "Load cloud save", cancel: "Keep this device", iconName: "cloud" }));
