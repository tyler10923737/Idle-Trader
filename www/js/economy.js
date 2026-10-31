// Core game state, economy math, trades, offline earnings, prestige and local saving.
// The formulas here are carried over from the original app.js so existing saves keep
// behaving the same. New fields (garage, mods, paints, outfits) get safe defaults.
import { UPGRADES, ASSETS, MENTORS, LEGACY, OUTFITS, GARAGE, BUSINESS_LEVEL_SCALE, DUPLICATE_SCALE, MOD_MAX, MOD_INCOME_PER_LEVEL, MOD_VALUE_PER_LEVEL, modCost, PAINTS, PAINT_COST_RATE, RANKS, DEALS, START_CASH, HEAD_START_CASH, PRODUCTS, ADS, BASE_MULTIPLIER, BASE_PROFIT, TRADE_TIMES, ASSET_BONUS_CAP, automationIncome, slotsIncome, SETUP_STEP, RESEARCH_STEP, MULT_STEP, LEVELS, DAILY } from "./data.js";
import { safeNum } from "./format.js";

export const SAVE_KEY = "idleTraderSaveV1"; // unchanged so old saves load
export const PURCHASE_KEY = "idleTraderPurchases"; // real-money entitlements live outside the save so a reset never loses them
function loadPurchases() { try { const p = JSON.parse(localStorage.getItem(PURCHASE_KEY) || "{}"); return { noAds: !!p.noAds, items: { ...(p.items || {}) } }; } catch (e) { return { noAds: false, items: {} }; } }
function savePurchases(p) { try { localStorage.setItem(PURCHASE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ } }
const mergePurchases = (a, b) => ({ noAds: !!(a && a.noAds) || !!(b && b.noAds), items: { ...((a && a.items) || {}), ...((b && b.items) || {}) } });
export const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
export const PRESTIGE_REQUIREMENT = 100000;

// ---------- tiny event bus ----------
const listeners = {};
export function on(evt, fn) { (listeners[evt] ||= []).push(fn); return () => { listeners[evt] = listeners[evt].filter(f => f !== fn); }; }
export function emit(evt, payload) { (listeners[evt] || []).slice().forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }

// ---------- state ----------
export const fresh = () => ({
  cash: START_CASH, lifetimeEarned: 0, lifetimeNetWorth: 0, runPeak: 0, prestiges: 0, legacyPoints: 0,
  legacy: { legacyCash: 0, legacyProfit: 0, legacyOffline: 0 },
  upgrades: { capacity: 0, duration: 0, setup: 0, multiplier: 0, slots: 0, automation: 0, research: 0, offline: 0 },
  baseAmount: 10, assets: {}, unlockedMentors: [], equippedMentor: null, trade: null, lastSeen: Date.now(), tradeCount: 0,
  // v2 fields
  garageLevel: 0, mods: {}, paints: {}, outfit: "hoodie", unlockedOutfits: ["hoodie"], legacyClaimed: 0,
  level: 1, xp: 0, completedAt: 0, version: 3,
  purchases: loadPurchases(), boostUntil: 0, lastInterstitialAt: 0, lastOffline: null, pendingInterstitial: false, adClock: 0, freeCashAt: 0,
  dailyDay: "", dailyStreak: 0
});
function applyEntitlements(s) { // premium items you paid for are always in the portfolio
  s.purchases = mergePurchases(s.purchases, loadPurchases());
  for (const id of Object.keys(s.purchases.items)) if (ASSETS.some(a => a.id === id && a.premium) && !(s.assets[id] > 0)) s.assets[id] = 1;
  return s;
}
let state = fresh();
export const getState = () => state;

export function normalize(raw) {
  const d = fresh();
  if (!raw || typeof raw !== "object") return d;
  const s = {
    ...d, ...raw,
    legacy: { ...d.legacy, ...(raw.legacy || {}) },
    upgrades: { ...d.upgrades, ...(raw.upgrades || {}) },
    assets: { ...(raw.assets || {}) },
    mods: { ...(raw.mods || {}) },
    paints: { ...(raw.paints || {}) },
    unlockedMentors: Array.isArray(raw.unlockedMentors) ? raw.unlockedMentors.filter(id => MENTORS.some(m => m.id === id)) : [],
    unlockedOutfits: Array.isArray(raw.unlockedOutfits) ? [...new Set(["hoodie", ...raw.unlockedOutfits.filter(id => OUTFITS.some(o => o.id === id))])] : ["hoodie"],
    cash: Math.max(0, safeNum(raw.cash)), lifetimeEarned: Math.max(0, safeNum(raw.lifetimeEarned)),
    lifetimeNetWorth: Math.max(0, safeNum(raw.lifetimeNetWorth)), legacyPoints: Math.max(0, safeNum(raw.legacyPoints)),
    baseAmount: Math.max(10, safeNum(raw.baseAmount)), prestiges: Math.max(0, Math.floor(safeNum(raw.prestiges))),
    tradeCount: Math.max(0, Math.floor(safeNum(raw.tradeCount))), garageLevel: Math.max(0, Math.floor(safeNum(raw.garageLevel))),
    lastSeen: safeNum(raw.lastSeen) || Date.now()
  };
  for (const k in s.upgrades) s.upgrades[k] = Math.max(0, Math.floor(safeNum(s.upgrades[k])));
  for (const k in s.legacy) s.legacy[k] = Math.max(0, Math.floor(safeNum(s.legacy[k])));
  // Legacy Points already awarded by past prestiges. Old saves don't have this field: rebuild it from
  // the points they hold plus the points they spent, so nobody can re-claim the same points twice.
  if (raw.legacyClaimed === undefined) s.legacyClaimed = s.prestiges > 0 ? s.legacyPoints + LEGACY.reduce((t, u) => t + u.cost * (s.legacy[u.id] || 0), 0) : 0;
  else s.legacyClaimed = Math.max(0, Math.floor(safeNum(raw.legacyClaimed)));
  for (const k of Object.keys(s.assets)) { const n = Math.max(0, Math.floor(safeNum(s.assets[k]))); if (!n || !ASSETS.some(a => a.id === k)) delete s.assets[k]; else s.assets[k] = n; }
  for (const k of Object.keys(s.mods)) { const n = Math.min(MOD_MAX, Math.max(0, Math.floor(safeNum(s.mods[k])))); if (!n || !ASSETS.some(a => a.id === k)) delete s.mods[k]; else s.mods[k] = n; }
  for (const k of Object.keys(s.paints)) { if (!PAINTS.some(p => p.id === s.paints[k]) || s.paints[k] === "stock") delete s.paints[k]; }
  if (!OUTFITS.some(o => o.id === s.outfit) || !s.unlockedOutfits.includes(s.outfit)) s.outfit = "hoodie";
  if (!MENTORS.some(m => m.id === s.equippedMentor) || !s.unlockedMentors.includes(s.equippedMentor)) s.equippedMentor = null;
  if (s.trade && !(Number.isFinite(s.trade.endsAt) && Number.isFinite(s.trade.amount))) s.trade = null;
  // Migration: an old save may own more cars than the new garage has spaces — grow it for free.
  const cars = carCount(s);
  while (garageSpaces(s) < cars && s.garageLevel < GARAGE.maxLevel) s.garageLevel++;
  // Levels: saves made before levels existed get a level estimated from what they earned and own.
  if (raw.level === undefined) {
    let lvl = LEVELS.estimate(s.lifetimeEarned);
    ASSETS.forEach(a => { if (s.assets[a.id] > 0) lvl = Math.max(lvl, a.unlock || 1); });
    MENTORS.forEach(m => { if (s.unlockedMentors.includes(m.id)) lvl = Math.max(lvl, m.unlock || 1); });
    OUTFITS.forEach(o => { if (s.unlockedOutfits.includes(o.id)) lvl = Math.max(lvl, o.unlock || 1); });
    UPGRADES.forEach(u => { if (s.upgrades[u.id] > 0) lvl = Math.max(lvl, u.unlock || 1); });
    s.level = lvl; s.xp = 0;
  } else { s.level = Math.max(1, Math.min(LEVELS.max, Math.floor(safeNum(raw.level)))); s.xp = Math.max(0, safeNum(raw.xp)); }
  for (const k in s.upgrades) { const u = UPGRADES.find(x => x.id === k); if (u && u.max !== undefined) s.upgrades[k] = Math.min(u.max, s.upgrades[k]); }
  s.purchases = mergePurchases(raw.purchases, d.purchases); s.boostUntil = safeNum(raw.boostUntil); s.lastInterstitialAt = safeNum(raw.lastInterstitialAt); s.lastOffline = null; s.pendingInterstitial = false; s.adClock = Math.max(0, safeNum(raw.adClock)); s.freeCashAt = Math.max(0, safeNum(raw.freeCashAt));
  s.dailyDay = typeof raw.dailyDay === "string" ? raw.dailyDay : ""; s.dailyStreak = Math.max(0, Math.floor(safeNum(raw.dailyStreak)));
  applyEntitlements(s);
  s.version = 3;
  return s;
}

// ---------- derived values (original formulas) ----------
export const assetById = id => ASSETS.find(a => a.id === id);
export const carCount = (s = state) => ASSETS.filter(a => a.kind === "car" && !a.premium).reduce((n, a) => n + (s.assets[a.id] || 0), 0); // premium cars bring their own spot
export const garageSpaces = (s = state) => GARAGE.baseSpaces + GARAGE.perLevel * s.garageLevel;
export const garageExpandCost = (s = state) => GARAGE.cost(s.garageLevel);
export const modLevel = (id, s = state) => s.mods[id] || 0;
export const paintOf = (id, s = state) => PAINTS.find(p => p.id === (s.paints[id] || "stock")) || PAINTS[0];
export const carColor = (a, s = state) => paintOf(a.id, s).color || a.color;
export function assetValueOf(a, s = state) { return a.value * (1 + MOD_VALUE_PER_LEVEL * modLevel(a.id, s)); }
export function assetIncomeOf(a, s = state) { return (a.incomeAt ? a.incomeAt(s.level) : a.income) * (1 + MOD_INCOME_PER_LEVEL * modLevel(a.id, s)); }
export const hasPerk = (perk, s = state) => ASSETS.some(a => a.perk === perk && (s.assets[a.id] || 0) > 0);
export const boostActive = (s = state) => (s.boostUntil || 0) > Date.now();
export const boostMult = (s = state) => (boostActive(s) ? ADS.boost.mult : 1);
export const boostRemaining = (s = state) => Math.max(0, ((s.boostUntil || 0) - Date.now()) / 1000);
export function assetPrice(a, s = state) { if (a.premium) return 0; const n = a.kind === "car" ? 0 : (s.assets[a.id] || 0); return Math.floor(a.price * Math.pow(a.kind === "business" ? BUSINESS_LEVEL_SCALE : DUPLICATE_SCALE, n)); } // cars: one of each, no duplicate pricing
// ---------- levels & unlocks ----------
export const unlockLevel = item => (item && item.unlock) || 1;
export const isUnlocked = (item, s = state) => s.level >= unlockLevel(item);
export const xpToNext = (s = state) => LEVELS.xpToNext(s.level);
export function upgradeTierLevel(u, s = state) { return (u.tiers && u.tiers[s.upgrades[u.id] + 1]) || 1; } // player level needed for the NEXT level of this upgrade
export function unlocksAt(level) {
  const list = [];
  UPGRADES.forEach(u => {
    if (u.unlock === level) list.push({ kind: "upgrade", name: u.name });
    if (u.tiers) Object.entries(u.tiers).forEach(([lv, need]) => { if (need === level) list.push({ kind: "upgrade", name: `${u.name} Lv ${lv}${u.id === "duration" && +lv === u.max ? " (instant trades)" : ""}` }); });
  });
  ASSETS.forEach(a => { if (a.unlock === level && !a.premium) list.push({ kind: a.kind, name: a.name }); });
  MENTORS.forEach(m => { if (m.unlock === level) list.push({ kind: "mentor", name: m.name }); });
  OUTFITS.forEach(o => { if (o.unlock === level) list.push({ kind: "outfit", name: o.name }); });
  return list;
}
export function nextUnlock(s = state) { for (let l = s.level + 1; l <= LEVELS.max; l++) { const u = unlocksAt(l); if (u.length) return { level: l, items: u }; } return null; }
export function gainXP(amount) {
  if (!(amount > 0)) return;
  state.xp += amount;
  const gained = []; let bonus = 0;
  while (state.level < LEVELS.max && state.xp >= LEVELS.xpToNext(state.level)) {
    state.xp -= LEVELS.xpToNext(state.level); state.level++; gained.push(state.level);
    const b = LEVELS.bonus(state.level); state.cash += b; bonus += b; // level-up cash bonus
  }
  if (state.level >= LEVELS.max) state.xp = Math.min(state.xp, LEVELS.xpToNext(state.level));
  if (gained.length) emit("levelup", { level: state.level, levels: gained, unlocks: gained.flatMap(l => unlocksAt(l)), bonus });
}
function lockedToast(item) { emit("toast", `${item.name} unlocks at level ${unlockLevel(item)}.`); }
export function assetModCost(a, s = state) { return modCost(a, modLevel(a.id, s)); }
export function paintCost(a) { return Math.floor(a.price * PAINT_COST_RATE); }
export function getAssetCount(s = state) { return Object.values(s.assets).reduce((a, b) => a + safeNum(b), 0); }
export function getAssetValue(s = state) { return ASSETS.reduce((sum, a) => sum + assetValueOf(a, s) * (s.assets[a.id] || 0), 0); }
export function getAssetIncome(s = state) { return ASSETS.reduce((sum, a) => sum + assetIncomeOf(a, s) * (s.assets[a.id] || 0), 0); }
export function getTradeTime(s = state) { return TRADE_TIMES[Math.max(0, Math.min(TRADE_TIMES.length - 1, s.upgrades.duration))]; }
export function profitFraction(s = state) { return BASE_PROFIT + s.upgrades.setup * SETUP_STEP + s.upgrades.research * RESEARCH_STEP; }
export function assetTypeBonus(s = state) { return Math.min(ASSET_BONUS_CAP, ASSETS.reduce((sum, a) => sum + ((s.assets[a.id] || 0) > 0 ? a.bonus : 0), 0)); }
export function getMentor(s = state) { return MENTORS.find(m => m.id === s.equippedMentor) || null; }
export function getMultiplier(s = state) {
  const mentor = getMentor(s);
  const mentorMult = mentor ? (mentor.type === "trade" || mentor.type === "all" ? mentor.mult : 1) : 1;
  return (BASE_MULTIPLIER + s.upgrades.multiplier * MULT_STEP) * (1 + s.legacy.legacyProfit * 0.1) * (1 + assetTypeBonus(s)) * (s.prestiges ? 1 + s.prestiges * 0.08 : 1) * mentorMult;
}
export function getIncome(s = state) {
  const mentor = getMentor(s);
  const assetMult = (mentor && (mentor.type === "asset" || mentor.type === "all") ? mentor.mult : 1) * (1 + s.legacy.legacyProfit * 0.1);
  // Parallel Deals and Trade Automation pay flat amounts: they are a steady floor, not a multiplier stack.
  const perk = hasPerk("income", s) ? 1.2 : 1; // The Mint: +20% passive income
  return (getAssetIncome(s) * assetMult * perk + slotsIncome(s.upgrades.slots) + automationIncome(s.upgrades.automation)) * boostMult(s);
}
export function netWorth(s = state) { return s.cash + getAssetValue(s); }
export function legacyPotential(s = state) { return Math.max(0, Math.floor(Math.sqrt(Math.max(0, s.lifetimeNetWorth) / 100000) - 1)); }
// Points a prestige would award right now = lifetime potential minus points already claimed by earlier prestiges.
export function legacyProjection(s = state) { return Math.max(0, legacyPotential(s) - (s.legacyClaimed || 0)); }
export function legacyMultiplier(s = state) { return 1 + s.legacy.legacyProfit * 0.1 + s.legacy.legacyCash * 0.05; }
export function offlinePct(s = state) { return Math.min(1, 0.25 + s.upgrades.offline * 0.15 + s.legacy.legacyOffline * 0.1 + (hasPerk("offline", s) ? 0.25 : 0)); }
// The multiplier applies to the PROFIT, not the stake: payout = stake × (1 + profit% × multiplier).
export function tradePayout(amount, s = state) { return amount * (1 + profitFraction(s) * getMultiplier(s) * boostMult(s)); }
export function rankIndex(s = state) { let i = 0; RANKS.forEach((r, idx) => { if (s.lifetimeNetWorth >= r.min) i = idx; }); return i; }
export function rankName(s = state) { return RANKS[rankIndex(s)].name; }
export function nextRank(s = state) { return RANKS[rankIndex(s) + 1] || null; }
export function officeTier(s = state) { const n = s.lifetimeNetWorth; return n >= 1e7 ? 4 : n >= 1e6 ? 3 : n >= 1e5 ? 2 : n >= 1e3 ? 1 : 0; }
export function currentDeal(s = state) { return DEALS[(s.trade ? s.trade.deal ?? s.tradeCount : s.tradeCount) % DEALS.length]; }
export function dealName(s = state) { const d = currentDeal(s); return `${d.sym} · ${d.name}`; }
export function isStarterTask(s = state) { return s.cash < 1 && !s.trade && getIncome(s) <= 0; }
export function canPrestige(s = state) { return s.lifetimeNetWorth >= PRESTIGE_REQUIREMENT && legacyProjection(s) > 0; }
export function tradeProgress(s = state) {
  if (!s.trade) return 0;
  const total = Math.max(1, (s.trade.endsAt - (s.trade.startedAt || (s.trade.endsAt - getTradeTime(s) * 1000))));
  return Math.min(1, Math.max(0, 1 - (s.trade.endsAt - Date.now()) / total));
}

// ---------- persistence ----------
export function saveLocal() {
  state.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); emit("saved", { ok: true }); return true; }
  catch (e) { emit("saved", { ok: false, error: e }); return false; }
}
export function queueSave() { saveLocal(); emit("queue-cloud"); }
export function loadLocal() {
  try { const raw = localStorage.getItem(SAVE_KEY); state = raw ? normalize(JSON.parse(raw)) : fresh(); }
  catch (e) { console.warn("Save could not be read, starting fresh.", e); state = fresh(); }
}
export function replaceState(raw) { // used by cloud load
  stopTradeTimer(); state = normalize(raw); applyOffline(); finishSavedTrade(); saveLocal(); emit("change", state);
}
export function exportSave() { return JSON.stringify(state); }
// Developer / test codes, typed into the Backup & restore box (Me → Backup / restore save).
// Set DEV_CODES to false before a store release.
export const DEV_CODES = true;
export function devCode(code) {
  if (!DEV_CODES) return false;
  const c = String(code || "").trim().toUpperCase();
  const grant = (cash, msg) => { state.cash += cash; afterChange(); emit("toast", msg); return true; };
  switch (c) {
    case "MONEY": return grant(1e6, "+$1,000,000 test money");
    case "RICH": return grant(1e9, "+$1,000,000,000 test money");
    case "LEVELUP": gainXP(LEVELS.xpToNext(state.level) - state.xp); afterChange(); return true;
    case "PREMIUM": { PRODUCTS.filter(p => p.kind === "item" || p.kind === "noads").forEach(p => applyPurchase(p.id)); emit("toast", "All premium items granted (test)."); return true; }
    case "CARS": { // one of every car (grows the garage to fit)
      const cars = ASSETS.filter(a => a.kind === "car"); cars.forEach(a => { state.assets[a.id] = Math.max(1, state.assets[a.id] || 0); });
      while (garageSpaces() < carCount() && state.garageLevel < GARAGE.maxLevel) state.garageLevel++;
      afterChange(); emit("toast", "One of every car parked in your garage."); return true;
    }
    case "UNLOCKALL": { const target = 24; let need = 0.5 - state.xp; for (let l = state.level; l < target; l++) need += LEVELS.xpToNext(l); if (need > 0) { gainXP(need); afterChange(); } else emit("toast", "Everything is already unlocked."); return true; }
    default: return false;
  }
}
export function importSave(json) { const raw = JSON.parse(json); if (!raw || typeof raw !== "object") throw new Error("Not a save file"); replaceState(raw); }

export function applyOffline() {
  const now = Date.now();
  const elapsed = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (now - (state.lastSeen || now)) / 1000));
  let result = null;
  if (elapsed > 5) {
    const rate = getIncome(), pctv = offlinePct();
    const earned = rate * elapsed * pctv;
    if (earned > 0) { state.cash += earned; state.lifetimeEarned += earned; result = { earned, elapsed, pct: pctv }; state.lastOffline = { earned, at: now, doubled: false }; }
  }
  if (elapsed * 1000 >= ADS.interstitialAfterAwayMs) state.pendingInterstitial = true;
  state.lastSeen = now; lastTick = now;
  if (result) { emit("offline", result); gainXP(LEVELS.xpPerSecond(getIncome()) * elapsed * 0.5); }
  return result;
}
// ---------- real-money store & ads (the UI calls these after the billing/ad provider confirms) ----------
export function productById(id) { return PRODUCTS.find(p => p.id === id) || null; }
export function cashPackAmount(p, s = state) { return Math.max(p.min || 0, Math.round(getIncome(s) / boostMult(s) * 3600 * (p.hours || 0))); }
export function ownsProduct(p, s = state) { return p.kind === "noads" ? !!s.purchases.noAds : p.kind === "item" ? !!s.purchases.items[p.item] : false; }
export function applyPurchase(productId) {
  const p = productById(productId); if (!p) return false;
  if (p.kind === "noads") state.purchases.noAds = true;
  else if (p.kind === "item") { state.purchases.items[p.item] = true; if (!(state.assets[p.item] > 0)) state.assets[p.item] = 1; state.lifetimeNetWorth = Math.max(state.lifetimeNetWorth, netWorth()); }
  else if (p.kind === "cash") { const amt = cashPackAmount(p); state.cash += amt; state.lifetimeEarned += amt; }
  savePurchases(state.purchases); afterChange(); emit("purchase", { type: "store", item: p, cost: 0 }); return true;
}
export function restorePurchases(entitlements) { // entitlements: { noAds, items } from the store (or the device record)
  state.purchases = mergePurchases(state.purchases, entitlements); applyEntitlements(state); savePurchases(state.purchases); afterChange(); return state.purchases;
}
export function startBoost(minutes = ADS.boost.minutes) { state.boostUntil = Math.min(Date.now() + ADS.boost.maxMinutes * 60 * 1000, Math.max(Date.now(), state.boostUntil || 0) + minutes * 60 * 1000); afterChange(); emit("boost", { until: state.boostUntil }); }
export function freeCashAmount(s = state) { return Math.max(ADS.cash.min, Math.round(getIncome(s) / boostMult(s) * ADS.cash.minutesOfIncome * 60)); }
export const freeCashIn = (s = state) => Math.max(0, (s.freeCashAt || 0) - Date.now()); // ms until the next free-cash ad
export function grantFreeCash() { const amt = freeCashAmount(); state.cash += amt; state.lifetimeEarned += amt; state.freeCashAt = Date.now() + ADS.cash.cooldownMs; afterChange(); emit("purchase", { type: "reward", cost: 0 }); return amt; }
export function doubleOffline() {
  const o = state.lastOffline; if (!o || o.doubled || !(o.earned > 0)) return 0;
  o.doubled = true; state.cash += o.earned; state.lifetimeEarned += o.earned; afterChange(); return o.earned;
}
// ---------- daily bonus ----------
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function dailyAmount(streak, s = state) { return Math.max(DAILY.min, Math.round(getIncome(s) / boostMult(s) * DAILY.minutesOfIncome * 60 * (1 + DAILY.stepPerDay * (Math.min(DAILY.maxDays, Math.max(1, streak)) - 1)))); }
export function checkDaily() { // call on boot / resume; returns { streak, amount } when a bonus was just paid
  const today = dayKey();
  if (state.dailyDay === today) return null;
  if (!state.dailyDay) { state.dailyDay = today; state.dailyStreak = 1; queueSave(); return null; } // first day: no popup, start the streak
  const yesterday = dayKey(Date.now() - 24 * 3600 * 1000);
  state.dailyStreak = state.dailyDay === yesterday ? state.dailyStreak + 1 : 1;
  const amount = dailyAmount(state.dailyStreak);
  state.dailyDay = today; state.cash += amount; state.lifetimeEarned += amount; afterChange();
  const r = { streak: state.dailyStreak, amount }; emit("daily", r); return r;
}
export function interstitialDue(s = state) {
  if (s.purchases.noAds || s.level < ADS.interstitialMinLevel) return false;
  return (s.adClock || 0) >= ADS.interstitialEverySec || (!!s.pendingInterstitial && Date.now() - (s.lastInterstitialAt || 0) >= 60 * 1000);
}
export function markInterstitial(shown) { state.pendingInterstitial = false; state.adClock = 0; if (shown) { state.lastInterstitialAt = Date.now(); queueSave(); } }

// ---------- trades ----------
let tradeTimer = null;
function stopTradeTimer() { if (tradeTimer) { clearTimeout(tradeTimer); tradeTimer = null; } }
export function startTrade() {
  if (state.trade) return { ok: false, reason: "busy" };
  const amount = Math.min(state.cash, state.baseAmount);
  if (isStarterTask()) {
    state.cash += 10; state.lifetimeEarned += 10; state.lifetimeNetWorth = Math.max(state.lifetimeNetWorth, netWorth());
    afterChange(); emit("starter"); return { ok: true, starter: true };
  }
  if (amount <= 0) { emit("toast", "You need cash before you can start a trade. Upgrade or wait for passive income."); return { ok: false, reason: "nocash" }; }
  state.cash -= amount;
  const duration = getTradeTime() * 1000;
  state.trade = { amount, startedAt: Date.now(), endsAt: Date.now() + duration, deal: state.tradeCount % DEALS.length };
  if (duration <= 0) { emit("trade:start", state.trade); completeTrade(); return { ok: true, instant: true }; }
  afterChange(); emit("trade:start", state.trade); tickTrade();
  return { ok: true };
}
function completeTrade() {
  const amount = state.trade.amount;
  const payout = tradePayout(amount);
  state.cash += payout; state.lifetimeEarned += payout; state.tradeCount++; state.trade = null;
  state.lifetimeNetWorth = Math.max(state.lifetimeNetWorth, netWorth());
  gainXP(LEVELS.xpForTrade(payout - amount, getTradeTime()));
  afterChange(); emit("trade:complete", { payout, amount, instant: getTradeTime() <= 0 });
}
export function tickTrade() {
  stopTradeTimer();
  const step = () => {
    if (!state.trade) { stopTradeTimer(); return; }
    const remaining = state.trade.endsAt - Date.now();
    emit("trade:tick", { remaining, progress: tradeProgress() });
    if (remaining <= 0) { stopTradeTimer(); completeTrade(); return; }
    tradeTimer = setTimeout(step, Math.max(16, Math.min(100, remaining))); // lands on the exact end, even for sub-second trades
  };
  step();
}
export function finishSavedTrade() {
  if (!state.trade) return;
  if (state.trade.endsAt - Date.now() <= 0) completeTrade(); else tickTrade();
}

// ---------- purchases & actions ----------
function afterChange() { queueSave(); emit("change", state); }
export function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id); if (!u) return false;
  if (!isUnlocked(u)) { lockedToast(u); return false; }
  const cost = u.cost(state);
  if (state.cash < cost || (u.max !== undefined && state.upgrades[id] >= u.max)) return false;
  const need = upgradeTierLevel(u);
  if (state.level < need) { emit("toast", `${u.name} level ${state.upgrades[id] + 1} unlocks at player level ${need}.`); return false; }
  state.cash -= cost; u.buy(state); gainXP(LEVELS.xpForPurchase(cost)); afterChange(); emit("purchase", { type: "upgrade", item: u, cost }); return true;
}
export function buyAsset(id) {
  const a = assetById(id); if (!a) return false;
  if (!isUnlocked(a)) { lockedToast(a); return false; }
  if (a.premium) { emit("toast", `${a.name} is a premium item — get it from the Shop.`); return false; }
  const price = assetPrice(a);
  if (state.cash < price) return false;
  if (a.kind === "car" && (state.assets[id] || 0) > 0) { emit("toast", `You already own the ${a.name} — the garage holds one of each car.`); return false; }
  if (a.kind === "car" && carCount() >= garageSpaces()) { emit("toast", "Garage full — expand your garage to park another car."); return false; }
  state.cash -= price; state.assets[id] = (state.assets[id] || 0) + 1;
  state.lifetimeNetWorth = Math.max(state.lifetimeNetWorth, netWorth());
  gainXP(LEVELS.xpForPurchase(price));
  afterChange(); emit("purchase", { type: "asset", item: a, cost: price });
  if (!state.completedAt && ASSETS.every(x => x.premium || (state.assets[x.id] || 0) > 0)) { state.completedAt = Date.now(); queueSave(); emit("complete", { at: state.completedAt }); }
  return true;
}
export function expandGarage() {
  if (state.garageLevel >= GARAGE.maxLevel) return false;
  const cost = garageExpandCost(); if (state.cash < cost) return false;
  state.cash -= cost; state.garageLevel++; gainXP(LEVELS.xpForPurchase(cost)); afterChange(); emit("purchase", { type: "garage", cost }); return true;
}
export function buyMod(id) {
  const a = assetById(id); if (!a || !(state.assets[id] > 0)) return false;
  const lvl = modLevel(id); if (lvl >= MOD_MAX) return false;
  const cost = modCost(a, lvl); if (state.cash < cost) return false;
  state.cash -= cost; state.mods[id] = lvl + 1; state.lifetimeNetWorth = Math.max(state.lifetimeNetWorth, netWorth());
  gainXP(LEVELS.xpForPurchase(cost));
  afterChange(); emit("purchase", { type: "mod", item: a, cost }); return true;
}
export function buyPaint(id, paintId) {
  const a = assetById(id); if (!a || !(state.assets[id] > 0)) return false;
  const p = PAINTS.find(x => x.id === paintId); if (!p) return false;
  if ((state.paints[id] || "stock") === paintId) return false;
  const cost = paintCost(a); if (state.cash < cost) return false;
  state.cash -= cost; if (paintId === "stock") delete state.paints[id]; else state.paints[id] = paintId;
  gainXP(LEVELS.xpForPurchase(cost));
  afterChange(); emit("purchase", { type: "paint", item: a, cost }); return true;
}
export function mentorAction(id) {
  const m = MENTORS.find(x => x.id === id); if (!m) return { ok: false };
  if (!state.unlockedMentors.includes(id)) {
    if (!isUnlocked(m)) { lockedToast(m); return { ok: false, locked: true }; }
    if (state.cash < m.price) return { ok: false };
    state.cash -= m.price; state.unlockedMentors.push(id); state.equippedMentor = id;
    gainXP(LEVELS.xpForPurchase(m.price));
    afterChange(); emit("purchase", { type: "mentor", item: m, cost: m.price }); return { ok: true, action: "recruited" };
  }
  state.equippedMentor = state.equippedMentor === id ? null : id;
  afterChange(); return { ok: true, action: state.equippedMentor ? "equipped" : "unequipped" };
}
export function buyLegacy(id) {
  const u = LEGACY.find(x => x.id === id); if (!u || state.legacyPoints < u.cost) return false;
  state.legacyPoints -= u.cost; u.apply(state); afterChange(); emit("purchase", { type: "legacy", item: u }); return true;
}
export function buyOutfit(id) {
  const o = OUTFITS.find(x => x.id === id); if (!o) return false;
  if (state.unlockedOutfits.includes(id)) { state.outfit = id; afterChange(); return true; }
  if (!isUnlocked(o)) { lockedToast(o); return false; }
  if (o.requiresPrestige && state.prestiges < o.requiresPrestige) return false;
  if (state.cash < o.price) return false;
  state.cash -= o.price; state.unlockedOutfits.push(id); state.outfit = id;
  gainXP(LEVELS.xpForPurchase(o.price));
  afterChange(); emit("purchase", { type: "outfit", item: o, cost: o.price }); return true;
}
export function doPrestige() {
  const pts = legacyProjection();
  if (!canPrestige()) return 0;
  const keep = { lifetimeEarned: state.lifetimeEarned, lifetimeNetWorth: state.lifetimeNetWorth, prestiges: state.prestiges + 1,
    legacyPoints: state.legacyPoints + pts, legacyClaimed: (state.legacyClaimed || 0) + pts, legacy: { ...state.legacy }, unlockedMentors: [...state.unlockedMentors],
    unlockedOutfits: [...state.unlockedOutfits], outfit: state.outfit, level: state.level, xp: state.xp, lastSeen: Date.now(), purchases: state.purchases, lastInterstitialAt: state.lastInterstitialAt };
  stopTradeTimer();
  state = fresh(); Object.assign(state, keep); applyEntitlements(state);
  state.cash = START_CASH + HEAD_START_CASH * state.legacy.legacyCash; state.runPeak = 0; // Head Start: $100 of starting cash per level
  afterChange(); emit("prestige", { pts }); return pts;
}
export function resetGame() { stopTradeTimer(); const kept = state.purchases; state = fresh(); state.purchases = mergePurchases(state.purchases, kept); applyEntitlements(state); afterChange(); emit("reset"); }

// ---------- main loop ----------
let lastTick = Date.now(), booted = false;
function tick() {
  const now = Date.now(), elapsed = Math.min(10, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (elapsed > 0) {
    const income = getIncome(), earned = income * elapsed;
    state.cash += earned; state.lifetimeEarned += earned;
    state.lifetimeNetWorth = Math.max(state.lifetimeNetWorth, netWorth());
    gainXP(LEVELS.xpPerSecond(income) * elapsed);
    if (typeof document === "undefined" || !document.hidden) state.adClock = (state.adClock || 0) + elapsed; // play time since the last forced ad
    emit("tick", state);
  }
}
export function boot() {
  loadLocal(); applyOffline(); finishSavedTrade(); checkDaily(); saveLocal();
  emit("change", state); emit("ready", state);
  if (booted) return; booted = true;
  setInterval(tick, 1000);
  setInterval(() => queueSave(), 10000);
  window.addEventListener("beforeunload", saveLocal);
  window.addEventListener("pagehide", saveLocal);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { saveLocal(); return; }
    const away = (Date.now() - (state.lastSeen || Date.now())) / 1000;
    if (away > 30) { applyOffline(); finishSavedTrade(); checkDaily(); emit("change", state); } else lastTick = Date.now();
    emit("resume", { away });
  });
}
