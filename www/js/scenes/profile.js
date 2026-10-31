// Profile: your character & outfits, mentors, prestige / legacy upgrades and settings.
import * as E from "../economy.js";
import { OUTFITS, MENTORS, LEGACY, RANKS, THEMES, LEVELS, ASSETS, STORE } from "../data.js";
import { fmt, numberFmt } from "../format.js";
import { outfitPreview, mentorPortrait, icon, characterSVG } from "../art.js";
import { $, el, esc, toast, sfx, coinBurst, confetti, pop, openSheet, modal, prefs, savePrefs, applyTheme } from "../ui.js";
import * as C from "../cloud.js";
import { openShop } from "./shop.js";
import * as monetize from "../monetize.js";
import * as device from "../device.js";

let refs = {}, outfitSig = "", mentorSig = "", legacySig = "", artSig = "";
const look = o => ({ top: o.top, accent: o.accent, pants: o.pants, style: o.style });

export const profileScene = {
  id: "profile", label: "Me", iconName: "profile",
  build(section) {
    section.innerHTML = `
      <div class="profile-hero">
        <div class="profile-art" id="profileArt"></div>
        <div class="profile-meta">
          <span class="eyebrow">YOUR TRADER</span>
          <h2 id="profileRank">Aspiring Trader</h2>
          <div class="rank-bar"><div class="rank-fill" id="rankFill"></div></div>
          <small id="rankNext"></small>
          <div class="mini-stats"><div><small>LEVEL</small><b id="pLevel">Lv 1</b></div><div><small>NET WORTH</small><b id="pNet">$0</b></div><div><small>TRADES</small><b id="pTrades">0</b></div><div><small>LEGACY</small><b id="pLegacy">0 LP</b></div></div>
          <div class="xp-bar" aria-hidden="true"><i id="pXpFill"></i></div><small id="pXp"></small><small class="bonus-next" id="pBonus"></small>
        </div>
      </div>
      <div class="scene-body">
        <div class="panel"><div class="panel-head"><div><span class="eyebrow">WARDROBE</span><h3>Outfits</h3></div></div><div class="outfit-row" id="outfitRow"></div></div>
        <div class="panel" id="mentorsPanel"><div class="panel-head"><div><span class="eyebrow">KNOWLEDGE IS LEVERAGE</span><h3>Mentors</h3></div><span class="chip" id="mentorCount">0 unlocked</span></div><p class="desc">Recruit specialists and equip one at a time. Your equipped mentor stands in your office.</p><div class="list" id="mentorList"></div></div>
        <div class="panel prestige-panel" id="prestigePanel">
          <div class="panel-head"><div><span class="eyebrow">LEGACY BEGINS HERE</span><h3>Prestige</h3></div><div class="prestige-emblem">${icon("trophy")}</div></div>
          <p class="desc">Reset cash, run upgrades, garage and assets to earn Legacy Points. You keep mentors, outfits and permanent legacy bonuses.</p>
          <div class="stat-row"><div class="stat"><small>LEGACY POINTS</small><b id="legacyProjection">0</b></div><div class="stat"><small>PERMANENT MULT.</small><b id="legacyMultiplier">x1.00</b></div><div class="stat"><small>PRESTIGES</small><b id="prestigeCount">0</b></div></div>
          <button class="btn btn-gold btn-big" id="prestigeBtn">Prestige unavailable</button>
          <p class="fine">Requires ${fmt(E.PRESTIGE_REQUIREMENT)} lifetime net worth. Rewards are based on lifetime progress.</p>
          <div class="list" id="legacyGrid"></div>
        </div>
        <div class="panel"><div class="panel-head"><div><span class="eyebrow">SETTINGS</span><h3>Game</h3></div></div>
          <div class="settings">
            <button class="setting" id="shopSetting">${icon("coin")}<span>Shop</span><b>Open</b></button>
            <button class="setting" id="restoreSetting">${icon("cloud")}<span>Restore purchases</span><b>Restore</b></button>
            <button class="setting" id="soundBtn">${icon("sound")}<span>Sound effects</span><b id="soundState">On</b></button>
            <button class="setting" id="themeBtn">${icon("paint")}<span>Theme</span><b id="themeState">Ocean</b></button>
            <button class="setting" id="notifBtn">${icon("bell")}<span>Reminders (notifications)</span><b id="notifState">On</b></button>
            <button class="setting" id="hapticBtn">${icon("bolt")}<span>Vibration</span><b id="hapticState">On</b></button>
            <button class="setting" id="shareBtn">${icon("share")}<span>Share my empire</span><b>Share</b></button>
            <button class="setting" id="rateBtn">${icon("star")}<span>Rate Idle Trader</span><b>Rate</b></button>
            <button class="setting" id="privacyBtn">${icon("info")}<span>Privacy policy</span><b>Open</b></button>
            <button class="setting" id="cloudBtn">${icon("cloud")}<span>Cloud save</span><b id="cloudState">Optional</b></button>
            <button class="setting" id="exportBtn">${icon("save")}<span>Backup / restore save</span><b>Copy</b></button>
            <button class="setting danger" id="resetBtn">${icon("reset")}<span>Reset game</span><b>Erase</b></button>
          </div>
          <p class="fine" id="saveNote">Progress is saved automatically on this device.</p>
        </div>
        <p class="fine">Idle Trader v2.4 · Virtual currency only. No real-money trading, prizes or withdrawals.</p>
      </div>`;
    refs = { art: $("#profileArt"), rank: $("#profileRank"), rankFill: $("#rankFill"), rankNext: $("#rankNext"), net: $("#pNet"), lvl: $("#pLevel"), pxp: $("#pXp"), pxpFill: $("#pXpFill"), pbonus: $("#pBonus"), trades: $("#pTrades"), legacy: $("#pLegacy"), outfits: $("#outfitRow"), mentorCount: $("#mentorCount"), mentors: $("#mentorList"), proj: $("#legacyProjection"), mult: $("#legacyMultiplier"), pcount: $("#prestigeCount"), pbtn: $("#prestigeBtn"), legacyGrid: $("#legacyGrid"), soundState: $("#soundState"), themeState: $("#themeState"), notifState: $("#notifState"), hapticState: $("#hapticState"), cloudState: $("#cloudState") };
    refs.outfits.addEventListener("click", ev => {
      const b = ev.target.closest("[data-outfit]"); if (!b) return;
      const o = OUTFITS.find(x => x.id === b.dataset.outfit), s = E.getState(), had = s.unlockedOutfits.includes(o.id);
      if (E.buyOutfit(o.id)) { if (had) { sfx.tap(); } else { sfx.buy(); coinBurst(b, 8); toast(`${o.name} unlocked!`, "good"); } }
      else { sfx.fail(); if (o.requiresPrestige && s.prestiges < o.requiresPrestige) toast(`Requires ${o.requiresPrestige} prestige.`); }
    });
    refs.mentors.addEventListener("click", ev => {
      const b = ev.target.closest("[data-mentor]"); if (!b) return;
      const m = MENTORS.find(x => x.id === b.dataset.mentor);
      const r = E.mentorAction(m.id);
      if (!r.ok) { sfx.fail(); return; }
      if (r.action === "recruited") { sfx.success(); coinBurst(b, 10); toast(`${m.name} recruited and equipped!`, "good"); }
      else { sfx.tap(); toast(r.action === "equipped" ? `${m.name} equipped.` : "Mentor unequipped."); }
    });
    refs.legacyGrid.addEventListener("click", ev => {
      const b = ev.target.closest("[data-legacy]"); if (!b) return;
      const u = LEGACY.find(x => x.id === b.dataset.legacy);
      if (E.buyLegacy(u.id)) { sfx.success(); pop(b.closest(".row")); toast(`${u.name} permanently upgraded!`, "good"); } else sfx.fail();
    });
    refs.pbtn.addEventListener("click", async () => {
      const pts = E.legacyProjection();
      if (!E.canPrestige()) { sfx.fail(); return; }
      sfx.tap();
      const ok = await modal({ title: `Prestige for ${pts} Legacy Point${pts === 1 ? "" : "s"}?`, text: "Cash, run upgrades, garage, assets and trade progress reset. Your unlocked mentors, outfits and permanent legacy upgrades stay.", ok: "Prestige now", cancel: "Not yet", iconName: "trophy", tone: "gold" });
      if (!ok) return;
      const got = E.doPrestige();
      sfx.prestige(); confetti(); toast(`Prestige complete! +${got} Legacy Points.`, "good");
    });
    $("#soundBtn").addEventListener("click", () => { prefs.sound = !prefs.sound; savePrefs(); refs.soundState.textContent = prefs.sound ? "On" : "Off"; if (prefs.sound) sfx.tap(); });
    $("#themeBtn").addEventListener("click", () => { sfx.tap(); openThemeSheet(); });
    $("#shopSetting").addEventListener("click", () => { sfx.tap(); openShop(); });
    $("#notifBtn").addEventListener("click", async () => { sfx.tap(); prefs.notifications = prefs.notifications === false; savePrefs(); refs.notifState.textContent = prefs.notifications ? "On" : "Off"; if (prefs.notifications) { const ok = await device.notificationsPermission(); if (!device.isNative()) toast("Reminders work in the iPhone / Android app."); else if (!ok) toast("Allow notifications in your phone's settings to get reminders."); } });
    $("#hapticBtn").addEventListener("click", () => { sfx.tap(); prefs.haptics = prefs.haptics === false; savePrefs(); refs.hapticState.textContent = prefs.haptics ? "On" : "Off"; if (prefs.haptics) device.haptic("medium"); });
    $("#shareBtn").addEventListener("click", async () => { sfx.tap(); const s = E.getState(); const n = k => ASSETS.filter(a => a.kind === k && s.assets[a.id] > 0).length; const r = await device.share(`I'm a level ${s.level} ${E.rankName(s)} in Idle Trader: ${fmt(E.netWorth(s))} net worth, ${n("car")} cars, ${n("property")} homes and ${n("business")} businesses. Can you beat that?`); if (r === "copied") toast("Copied to your clipboard — paste it anywhere.", "good"); });
    $("#rateBtn").addEventListener("click", async () => { sfx.tap(); if (device.isNative()) { await device.requestReview(); return; } const url = device.storeUrl(); if (url) device.openUrl(url); else toast("Rating opens the App Store / Google Play once the app is published."); });
    $("#privacyBtn").addEventListener("click", () => { sfx.tap(); device.openUrl(STORE.privacyUrl); });
    $("#restoreSetting").addEventListener("click", async () => { sfx.tap(); await monetize.restore(); });
    refs.themeState.textContent = (THEMES.find(t => t.id === prefs.theme) || THEMES[0]).name;
    $("#cloudBtn").addEventListener("click", () => { sfx.tap(); openCloudSheet(); });
    $("#exportBtn").addEventListener("click", () => { sfx.tap(); openBackupSheet(); });
    $("#resetBtn").addEventListener("click", async () => {
      sfx.tap();
      const ok = await modal({ title: "Erase all progress?", text: "This deletes your save on this device, including prestige and legacy upgrades. This cannot be undone.", ok: "Erase everything", cancel: "Keep playing", iconName: "reset", tone: "danger" });
      if (ok) { E.resetGame(); toast("Game reset. Fresh start!"); }
    });
    E.on("cloud:status", ({ user }) => { refs.cloudState.textContent = user ? "Signed in" : (C.isConfigured() ? "Sign in" : "Optional"); });
  },
  update(s) {
    const cur = OUTFITS.find(o => o.id === s.outfit) || OUTFITS[0];
    if (artSig !== s.outfit) { artSig = s.outfit; refs.art.innerHTML = characterSVG(look(cur), "stand", "profile-chara"); }
    refs.rank.textContent = E.rankName(s);
    const idx = E.rankIndex(s), nr = RANKS[idx + 1];
    if (nr) { const lo = RANKS[idx].min, p = Math.min(1, Math.max(0, (s.lifetimeNetWorth - lo) / (nr.min - lo))); refs.rankFill.style.width = (p * 100).toFixed(1) + "%"; refs.rankNext.textContent = `${fmt(s.lifetimeNetWorth)} / ${fmt(nr.min)} to ${nr.name}`; }
    else { refs.rankFill.style.width = "100%"; refs.rankNext.textContent = "Top rank reached"; }
    refs.net.textContent = fmt(E.netWorth(s)); refs.lvl.textContent = "Lv " + s.level; refs.trades.textContent = numberFmt(s.tradeCount); refs.legacy.textContent = numberFmt(s.legacyPoints) + " LP";
    const nx = E.xpToNext(s), nu = E.nextUnlock(s);
    refs.pxpFill.style.width = Math.min(100, s.xp / nx * 100).toFixed(1) + "%";
    refs.pxp.textContent = `${Math.floor(s.xp)} / ${nx} XP to level ${s.level + 1}` + (nu ? ` · next unlock at Lv ${nu.level}: ${nu.items[0].name}` : "");
    refs.pbonus.textContent = s.level < LEVELS.max ? `Level ${s.level + 1} bonus: +${fmt(LEVELS.bonus(s.level + 1))} cash` : "Max level reached";
    // outfits
    const osig = [s.outfit, s.unlockedOutfits.join(","), s.prestiges, s.level, OUTFITS.map(o => s.cash >= o.price ? 1 : 0).join("")].join("|");
    if (osig !== outfitSig) {
      outfitSig = osig;
      refs.outfits.innerHTML = OUTFITS.map(o => {
        const have = s.unlockedOutfits.includes(o.id), on = s.outfit === o.id, lvlLock = !have && !E.isUnlocked(o, s), locked = lvlLock || (o.requiresPrestige && s.prestiges < o.requiresPrestige);
        const label = on ? "WEARING" : have ? "WEAR" : lvlLock ? `LEVEL ${o.unlock}` : locked ? `PRESTIGE ${o.requiresPrestige}` : fmt(o.price);
        return `<button class="outfit ${on ? "on" : ""} ${have ? "have" : ""} ${locked ? "locked" : ""}" data-outfit="${o.id}" ${(!have && (locked || s.cash < o.price)) ? "disabled" : ""}>${outfitPreview(o)}<b>${esc(o.name)}</b><span class="tag ${on ? "tag-gold" : locked ? "tag-lock" : ""}">${locked && !have ? icon("lock") : ""}${label}</span></button>`;
      }).join("");
    }
    // mentors
    const msig = [s.unlockedMentors.join(","), s.equippedMentor, s.level, MENTORS.map(m => s.cash >= m.price ? 1 : 0).join("")].join("|");
    if (msig !== mentorSig) {
      mentorSig = msig;
      refs.mentorCount.textContent = `${s.unlockedMentors.length} unlocked`;
      refs.mentors.innerHTML = MENTORS.map(m => {
        const unlocked = s.unlockedMentors.includes(m.id), equipped = s.equippedMentor === m.id, locked = !unlocked && !E.isUnlocked(m, s);
        return `<div class="row mentor-row ${equipped ? "equipped" : ""} ${locked ? "locked" : ""}"><div class="row-portrait">${mentorPortrait(m)}</div><div class="row-main"><div class="row-title"><b>${esc(m.name)}</b><span class="tag ${locked ? "tag-lock" : "tag-" + m.rarity.toLowerCase()}">${locked ? icon("lock") + " LEVEL " + m.unlock : m.rarity.toUpperCase()}</span></div><p>${esc(m.desc)}</p><div class="row-effect">${esc(m.bonus)}</div></div><button class="btn btn-sm ${equipped ? "btn-gold" : unlocked ? "btn-cyan" : "btn-gold"}" data-mentor="${m.id}" ${(!unlocked && (locked || s.cash < m.price)) ? "disabled" : ""}>${equipped ? "Equipped" : unlocked ? "Equip" : locked ? `Lv ${m.unlock}` : fmt(m.price)}</button></div>`;
      }).join("");
    }
    // prestige
    const pts = E.legacyProjection(s);
    refs.proj.textContent = numberFmt(pts); refs.mult.textContent = "x" + E.legacyMultiplier(s).toFixed(2); refs.pcount.textContent = numberFmt(s.prestiges);
    refs.pbtn.disabled = !E.canPrestige(s);
    refs.pbtn.textContent = s.lifetimeNetWorth < E.PRESTIGE_REQUIREMENT ? `Reach ${fmt(E.PRESTIGE_REQUIREMENT)} net worth (${fmt(s.lifetimeNetWorth)})` : pts <= 0 ? "Grow further to earn Legacy Points" : `Prestige for ${pts} Legacy Point${pts === 1 ? "" : "s"}`;
    const lsig = [s.legacyPoints, Object.values(s.legacy).join(",")].join("|");
    if (lsig !== legacySig) {
      legacySig = lsig;
      refs.legacyGrid.innerHTML = LEGACY.map(u => `<div class="row"><div class="row-icon">${icon(u.icon)}</div><div class="row-main"><div class="row-title"><b>${esc(u.name)}</b><span class="tag">LV ${s.legacy[u.id]}</span></div><p>${esc(u.desc)}</p><div class="row-effect">${esc(u.effect(s))}</div></div><button class="btn btn-sm btn-cyan" data-legacy="${u.id}" ${s.legacyPoints < u.cost ? "disabled" : ""}>${u.cost} LP</button></div>`).join("");
    }
    refs.soundState.textContent = prefs.sound ? "On" : "Off";
    refs.themeState.textContent = (THEMES.find(t => t.id === prefs.theme) || THEMES[0]).name;
    refs.notifState.textContent = prefs.notifications === false ? "Off" : "On"; refs.hapticState.textContent = prefs.haptics === false ? "Off" : "On";
  }
};

function openCloudSheet() {
  const configured = C.isConfigured();
  const body = el(`<div class="cloud-form">
    <p class="desc">${configured ? "Sign in with an email and password to sync your save between devices." : "Cloud sync is optional. To enable it, create a free Firebase project and paste its web config into <code>firebase-config.js</code> (see README). Until then, the game saves automatically on this device."}</p>
    <label>Email<input id="cloudEmail" type="email" placeholder="you@example.com" autocomplete="email" ${configured ? "" : "disabled"}></label>
    <label>Password<input id="cloudPassword" type="password" placeholder="At least 6 characters" autocomplete="current-password" ${configured ? "" : "disabled"}></label>
    <div class="btn-row"><button class="btn btn-gold" id="signInBtn" ${configured ? "" : "disabled"}>Sign in / create account</button><button class="btn btn-cyan" id="syncBtn" ${configured ? "" : "disabled"}>Sync save now</button></div>
    <p class="cloud-message" id="cloudMessage">${configured ? (C.cloud.user ? `Signed in as ${esc(C.cloud.user.email)}.` : "Not signed in.") : "Cloud save is not configured — local saves only."}</p>
  </div>`);
  const msg = body.querySelector("#cloudMessage");
  const off = E.on("cloud:message", m => { msg.textContent = m; });
  body.querySelector("#signInBtn").addEventListener("click", async () => { sfx.tap(); await C.signIn(body.querySelector("#cloudEmail").value.trim(), body.querySelector("#cloudPassword").value); });
  body.querySelector("#syncBtn").addEventListener("click", async () => { sfx.tap(); await C.syncCloud(true); });
  openSheet({ title: "Cloud save", subtitle: "Optional · requires your own Firebase project", body, onClose: off });
}
function openThemeSheet() {
  const body = el(`<div class="theme-grid"></div>`);
  const render = () => { body.innerHTML = THEMES.map(t => `<button class="swatch ${(prefs.theme || "ocean") === t.id ? "on" : ""}" data-theme-id="${t.id}" style="--c1:${t.c[0]};--c2:${t.c[1]};--c3:${t.c[2]}"><i></i><span>${esc(t.name)}</span></button>`).join(""); };
  render();
  body.addEventListener("click", ev => {
    const b = ev.target.closest("[data-theme-id]"); if (!b) return;
    prefs.theme = b.dataset.themeId; savePrefs(); applyTheme(prefs.theme); sfx.buy(); render();
    const st = $("#themeState"); if (st) st.textContent = (THEMES.find(t => t.id === prefs.theme) || THEMES[0]).name;
  });
  openSheet({ title: "Theme", subtitle: "Pick the colors of the app. Saved on this device.", body });
}
function openBackupSheet() {
  const body = el(`<div class="cloud-form"><p class="desc">Copy this code to back up your game, or paste a code below to restore it on another device.</p><textarea id="saveText" rows="5" spellcheck="false"></textarea><div class="btn-row"><button class="btn btn-cyan" id="copySave">Copy backup</button><button class="btn btn-gold" id="loadSave">Restore from code</button></div><p class="cloud-message" id="backupMsg">Your current save is shown above.</p></div>`);
  const ta = body.querySelector("#saveText"), msg = body.querySelector("#backupMsg");
  ta.value = btoa(unescape(encodeURIComponent(E.exportSave())));
  body.querySelector("#copySave").addEventListener("click", async () => { try { await navigator.clipboard.writeText(ta.value); msg.textContent = "Backup copied to clipboard."; } catch (e) { ta.select(); msg.textContent = "Select the code and copy it manually."; } });
  body.querySelector("#loadSave").addEventListener("click", async () => {
    if (E.devCode(ta.value)) { msg.textContent = "Test code accepted."; sfx.success(); ta.value = ""; return; }
    const ok = await modal({ title: "Restore this save?", text: "Your current progress on this device will be replaced.", ok: "Restore", cancel: "Cancel", iconName: "save" });
    if (!ok) return;
    try { E.importSave(decodeURIComponent(escape(atob(ta.value.trim())))); msg.textContent = "Save restored!"; toast("Save restored.", "good"); } catch (e) { msg.textContent = "That code doesn't look like a valid backup."; sfx.fail(); }
  });
  openSheet({ title: "Backup & restore", body });
}
