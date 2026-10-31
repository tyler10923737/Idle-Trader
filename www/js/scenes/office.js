// Office scene: the character at the trading desk. Trading happens here; upgrades change the room.
import * as E from "../economy.js";
import { UPGRADES, OUTFITS, ASSETS, RANKS, tradeTimeLabel, ADS } from "../data.js";
import * as monetize from "../monetize.js";
import { fmt } from "../format.js";
import { icon } from "../art.js";
import { officeSVG3D } from "../office3d.js";
import { $, el, esc, toast, sfx, coinBurst, bump, pop, openSheet } from "../ui.js";
import { router } from "../router.js";

const TIER_NAMES = ["Starter Desk", "Home Office", "Corner Office", "Executive Suite", "Penthouse HQ"];
const FLAVOR = ["Reinvest profits to grow faster.", "Mentors multiply everything you earn.", "Assets pay you every second — even offline.", "Prestige turns a great run into permanent bonuses.", "Deal Optimization shortens every trade.", "Tap the window to visit your properties.", "Tap the garage door to browse cars."];

let root, refs = {}, artSig = "", flavorIdx = 0, lastFlavor = 0;

function outfitLook(s) { const o = OUTFITS.find(x => x.id === s.outfit) || OUTFITS[0]; return { top: o.top, accent: o.accent, pants: o.pants, style: o.style }; }
function tip(s) {
  if (E.isStarterTask(s)) return "Tap START to finish your first task and earn $10!";
  if (s.tradeCount === 0 && !s.trade) return "Tap START TRADE to put your $10 to work on your first deal!";
  if (s.trade) return "Deal in motion… profit lands when the bar fills.";
  const first = UPGRADES.find(u => E.isUnlocked(u, s) && s.cash >= u.cost(s) && !(u.max !== undefined && s.upgrades[u.id] >= u.max));
  if (first && Object.values(s.upgrades).every(v => v === 0)) return `You can afford ${first.name} — tap the desk to buy your first upgrade.`;
  if (E.carCount(s) === 0 && s.cash >= 500) return "Your first car is within reach. Tap the garage door!";
  if (E.canPrestige(s)) return "Prestige is ready! Earn Legacy Points from your profile.";
  const affordable = UPGRADES.filter(u => E.isUnlocked(u, s) && s.cash >= u.cost(s) && !(u.max !== undefined && s.upgrades[u.id] >= u.max));
  if (affordable.length && Date.now() - lastFlavor > 12000) return `Upgrade ready: ${affordable[0].name}. Tap the desk.`;
  if (Date.now() - lastFlavor > 9000) { lastFlavor = Date.now(); flavorIdx = (flavorIdx + 1) % FLAVOR.length; }
  return FLAVOR[flavorIdx];
}

export const officeScene = {
  id: "office", label: "Office", iconName: "office",
  build(section) {
    root = section;
    root.innerHTML = `
      <div class="art-box office-box">
        <div class="art" id="officeArt"></div>
        <div class="bubble" id="officeBubble"></div>
        <div class="art-chip" id="officeTier">${icon("star")}<span>Starter Desk</span></div>
      </div>
      <div class="scene-body">
        <div class="panel trade-panel">
          <div class="panel-head"><div><span class="eyebrow" id="dealLabel">CURRENT DEAL · #1</span><h3 id="dealName">ZPHR · Zephyr Dynamics</h3></div><span class="chip chip-live"><i></i>MARKET OPEN</span></div>
          <div class="stat-row"><div class="stat"><small>INVEST</small><b id="tradeAmount">$10</b></div><div class="stat"><small>EST. RETURN</small><b id="tradeReturn" class="good">$12</b></div><div class="stat"><small>DURATION</small><b id="tradeTime">10 sec</b></div></div>
          <div class="progress"><div class="progress-fill" id="tradeProgress"></div><span class="progress-label" id="tradeCountdown">READY</span></div>
          <button class="btn btn-gold btn-big" id="tradeBtn">START TRADE</button>
          <button class="ad-btn" id="boostBtn">${icon("play")}<span id="boostTxt">Watch an ad: 2× earnings for 5 min</span></button>
          <div class="strategy"><span>${icon("cash")} Capacity <b id="capLv">Lv 1</b></span><span>${icon("clock")} Speed <b id="spdLv">Lv 1</b></span><span>${icon("sparkle")} Multiplier <b id="multTxt">x1.00</b></span></div>
        </div>
        <div class="quick-row">
          <button class="quick" id="openUpgrades">${icon("up")}<b>Upgrades</b><small id="upgradeHint">8 available</small></button>
          <button class="quick" id="goMentor">${icon("profile")}<b>Mentor</b><small id="mentorHint">None equipped</small></button>
          <button class="quick" id="goGarage">${icon("garage")}<b>Garage</b><small id="garageHint">0 cars</small></button>
        </div>
        <div class="panel"><div class="panel-head"><div><span class="eyebrow">MILESTONES</span><h3>Next targets</h3></div></div><div class="milestones" id="milestones"></div></div>
        <p class="fine">Trades are simulated game mechanics. Virtual currency only — no real money is used.</p>
      </div>`;
    refs = { art: $("#officeArt"), bubble: $("#officeBubble"), tier: $("#officeTier span"), dealLabel: $("#dealLabel"), dealName: $("#dealName"), amount: $("#tradeAmount"), ret: $("#tradeReturn"), time: $("#tradeTime"), progress: $("#tradeProgress"), countdown: $("#tradeCountdown"), btn: $("#tradeBtn"), capLv: $("#capLv"), spdLv: $("#spdLv"), mult: $("#multTxt"), upgradeHint: $("#upgradeHint"), mentorHint: $("#mentorHint"), garageHint: $("#garageHint"), milestones: $("#milestones") };
    refs.btn.addEventListener("click", () => {
      const r = E.startTrade();
      if (r.ok && r.starter) { sfx.coin(); coinBurst(refs.btn, 8); toast("Starter task complete: +$10. Your first trade is ready!", "good"); }
      else if (r.ok && !r.instant) { sfx.whoosh(); bump(refs.btn); }
      else if (r.reason === "nocash") sfx.fail();
    });
    $("#openUpgrades").addEventListener("click", () => { sfx.tap(); openUpgradeSheet(); });
    refs.boostBtn = $("#boostBtn"); refs.boostTxt = $("#boostTxt");
    refs.boostBtn.addEventListener("click", async ev => { const b = ev.currentTarget; sfx.tap(); b.disabled = true; try { await monetize.watchRewarded("boost"); } finally { b.disabled = false; } });
    $("#goMentor").addEventListener("click", () => { sfx.tap(); router.go("profile", "mentors"); });
    $("#goGarage").addEventListener("click", () => { sfx.tap(); router.go("garage"); });
    refs.art.addEventListener("click", e => {
      const hot = e.target.closest("[data-go]"); if (!hot) return;
      sfx.tap();
      if (hot.dataset.go === "upgrades") openUpgradeSheet(); else router.go(hot.dataset.go);
    });
    E.on("trade:tick", ({ progress, remaining }) => {
      refs.progress.style.width = (progress * 100).toFixed(1) + "%";
      refs.countdown.textContent = Math.max(0, Math.ceil(remaining / 1000)) + " SEC";
    });
    E.on("trade:complete", ({ payout, instant }) => {
      sfx.coin(); coinBurst(refs.btn, instant ? 4 : 12); toast(`Trade complete: +${fmt(payout)}!`, "good");
      if (instant) { bump(refs.btn); refs.progress.classList.remove("zap"); void refs.progress.offsetWidth; refs.progress.classList.add("zap"); }
      const flash = refs.art.querySelector(".flash"); if (flash) { flash.classList.remove("flashing"); void flash.getBoundingClientRect(); flash.classList.add("flashing"); }
    });
  },
  update(s) {
    const tier = E.officeTier(s), mentor = E.getMentor(s);
    const sig = [tier, Object.values(s.upgrades).join(","), s.outfit, s.equippedMentor, s.prestiges].join("|");
    if (sig !== artSig) { artSig = sig; refs.art.innerHTML = officeSVG3D({ tier, upgrades: s.upgrades, outfit: outfitLook(s), mentor, prestiges: s.prestiges }); refs.tier.textContent = TIER_NAMES[tier]; }
    const starter = E.isStarterTask(s), amount = s.trade ? s.trade.amount : Math.min(s.cash, s.baseAmount);
    refs.dealLabel.textContent = `CURRENT DEAL · #${(s.tradeCount + 1).toString().padStart(3, "0")}`;
    refs.dealName.textContent = starter ? "Starter task: set up your desk" : E.dealName(s);
    refs.amount.textContent = starter ? "$0" : fmt(amount > 0 ? amount : s.baseAmount);
    refs.ret.textContent = starter ? "+$10" : fmt(E.tradePayout(amount > 0 ? amount : s.baseAmount, s));
    refs.time.textContent = tradeTimeLabel(E.getTradeTime(s));
    refs.capLv.textContent = "Lv " + (s.upgrades.capacity + 1); refs.spdLv.textContent = "Lv " + (s.upgrades.duration + 1); refs.mult.textContent = "x" + E.getMultiplier(s).toFixed(2);
    if (s.trade) { refs.btn.textContent = "DEAL IN PROGRESS…"; refs.btn.disabled = true; refs.progress.style.width = (E.tradeProgress(s) * 100).toFixed(1) + "%"; refs.countdown.textContent = Math.max(0, Math.ceil((s.trade.endsAt - Date.now()) / 1000)) + " SEC"; }
    else { refs.btn.textContent = starter ? "COMPLETE STARTER TASK (+$10)" : E.getTradeTime(s) > 0 ? "START TRADE" : "TRADE · INSTANT"; refs.btn.disabled = false; refs.progress.style.width = "0%"; refs.countdown.textContent = E.getTradeTime(s) > 0 ? "READY" : "TAP AWAY"; }
    refs.bubble.textContent = tip(s);
    const left = E.boostRemaining(s), canAd = monetize.adsAvailable();
    refs.boostBtn.hidden = !canAd;
    refs.boostBtn.classList.toggle("active", left > 0);
    refs.boostTxt.textContent = left > 0 ? `${ADS.boost.mult}× boost active · ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")} left · watch an ad to extend` : `Watch an ad: ${ADS.boost.mult}× earnings for ${ADS.boost.minutes} min`;
    const affordable = UPGRADES.filter(u => E.isUnlocked(u, s) && s.cash >= u.cost(s) && !(u.max !== undefined && s.upgrades[u.id] >= u.max)).length;
    refs.upgradeHint.textContent = affordable ? `${affordable} affordable` : "Keep earning";
    refs.upgradeHint.classList.toggle("good", affordable > 0);
    refs.mentorHint.textContent = mentor ? mentor.name : "None equipped";
    refs.garageHint.textContent = `${E.carCount(s)} car${E.carCount(s) === 1 ? "" : "s"}`;
    const nr = E.nextRank(s), nu = E.nextUnlock(s);
    const firstCar = ASSETS.find(a => a.kind === "car");
    const ms = [
      { icon: "medal", name: `Level ${s.level + 1}`, done: false, desc: `${Math.floor(s.xp)} / ${E.xpToNext(s)} XP` + (nu && nu.level === s.level + 1 ? ` · unlocks ${nu.items[0].name}` : "") },
      { icon: "garage", name: "First car", done: E.carCount(s) > 0, desc: E.carCount(s) > 0 ? "Parked in your garage" : `Buy ${firstCar.name} for ${fmt(firstCar.price)}` },
      { icon: "medal", name: nr ? `Rank: ${nr.name}` : "Top rank reached", done: !nr, desc: nr ? `${fmt(s.lifetimeNetWorth)} / ${fmt(nr.min)} net worth` : "Market Legend" },
      { icon: "trophy", name: "Prestige", done: s.prestiges > 0, desc: s.prestiges ? `${s.prestiges} prestige${s.prestiges > 1 ? "s" : ""} complete` : `Reach ${fmt(E.PRESTIGE_REQUIREMENT)} net worth` }
    ];
    const html = ms.map(m => `<div class="milestone ${m.done ? "done" : ""}"><div class="ms-icon">${icon(m.done ? "check" : m.icon)}</div><div><b>${esc(m.name)}</b><small>${esc(m.desc)}</small></div></div>`).join("");
    if (refs.milestones.innerHTML !== html) refs.milestones.innerHTML = html;
  }
};

export function openUpgradeSheet() {
  const body = el(`<div class="list"></div>`);
  const rows = {};
  UPGRADES.forEach(u => {
    const row = el(`<div class="row"><div class="row-icon">${icon(u.icon)}</div><div class="row-main"><div class="row-title"><b>${esc(u.name)}</b><span class="tag" data-lv></span></div><p>${esc(u.desc)}</p><div class="row-effect" data-effect></div><div class="row-visual">${icon("sparkle")} ${esc(u.visual)}</div></div><button class="btn btn-sm btn-gold" data-buy>$0</button></div>`);
    row.querySelector("[data-buy]").addEventListener("click", ev => {
      if (E.buyUpgrade(u.id)) { sfx.buy(); coinBurst(ev.currentTarget, 7); pop(row); toast(`${u.name} upgraded!`, "good"); } else sfx.fail();
    });
    rows[u.id] = row; body.appendChild(row);
  });
  const refresh = s => UPGRADES.forEach(u => {
    const row = rows[u.id], level = s.upgrades[u.id], cost = u.cost(s), max = u.max !== undefined && level >= u.max, need = E.upgradeTierLevel(u, s), locked = !E.isUnlocked(u, s) || s.level < need;
    row.querySelector("[data-lv]").textContent = max ? `LEVEL ${level} · MAX` : `LEVEL ${level}${u.max ? " / " + u.max : ""}`;
    row.querySelector("[data-effect]").textContent = u.effect(s);
    const b = row.querySelector("[data-buy]"); b.textContent = !E.isUnlocked(u, s) ? `Lv ${u.unlock}` : locked ? `Lv ${need}` : max ? "MAX" : fmt(cost); b.disabled = locked || max || s.cash < cost;
    row.classList.toggle("can", !locked && !max && s.cash >= cost);
    row.classList.toggle("locked", locked);
  });
  refresh(E.getState());
  openSheet({ title: "Office upgrades", subtitle: "Every level improves your desk, speed or profits — and your office.", body, onUpdate: refresh });
}
router.openUpgrades = openUpgradeSheet;
