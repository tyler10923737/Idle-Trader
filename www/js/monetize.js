// monetize.js — real-money purchases and ads behind one small interface.
//
// The game never talks to a store directly. It asks a PROVIDER to sell a product or show an ad, and only when the
// provider says "done" does the economy grant anything (economy.applyPurchase / startBoost / doubleOffline).
//
//   window.IdleTraderBilling = { purchase(product) -> Promise<bool>, restore() -> Promise<{noAds, items}>,
//                               rewardedAd() -> Promise<bool>, interstitial() -> Promise<bool>,
//                               showBanner(el) / hideBanner() (el = the reserved strip at the bottom), adsAvailable: bool }
//
// A native build (Capacitor) sets window.IdleTraderBilling from a plugin such as RevenueCat (purchases) and AdMob (ads)
// — see README "Making money". Without a provider the built-in TEST provider simulates purchases and ads, so the whole
// flow can be played through on the web, but nobody is charged and nothing is earned.
import { PRODUCTS, ADS } from "./data.js";
import * as E from "./economy.js";
import { modal, toast, sfx, el, esc } from "./ui.js";
import { icon, characterSVG } from "./art.js";
import { fmt } from "./format.js";

export const productById = id => PRODUCTS.find(p => p.id === id) || null;
export const priceLabel = p => `$${p.priceUSD.toFixed(2)}`;
export const isTestMode = () => !window.IdleTraderBilling;

// ---------- TEST provider (web / development) ----------
function testAd(kind) {
  return new Promise(resolve => {
    const secs = ADS.testAdSeconds;
    const o = el(`<div class="ad-overlay"><div class="ad-box">
      <div class="ad-top"><span class="ad-label">${kind === "rewarded" ? "REWARDED AD" : "ADVERTISEMENT"} · TEST</span><button class="ad-close" data-close aria-label="Close" disabled>${secs}</button></div>
      <div class="ad-creative">${characterSVG({ top: "#ffc43d", accent: "#23262f", pants: "#23262f", style: "suit" }, "stand", "ad-chara")}<div><b>Your ad here</b><p>In the published app this is a real ${kind === "rewarded" ? "rewarded video" : "interstitial"} from the ad network. In test mode it's a ${secs}-second placeholder.</p></div></div>
      <div class="ad-foot">${kind === "rewarded" ? `Reward unlocks in <b data-left>${secs}</b>s` : `Closes in <b data-left>${secs}</b>s`}</div>
    </div></div>`);
    document.body.appendChild(o); requestAnimationFrame(() => o.classList.add("open"));
    const btn = o.querySelector("[data-close]"), left = o.querySelector("[data-left]");
    let n = secs; const timer = setInterval(() => { n--; left.textContent = n; btn.textContent = n > 0 ? n : "×"; if (n <= 0) { clearInterval(timer); btn.disabled = false; btn.classList.add("ready"); o.querySelector(".ad-foot").innerHTML = kind === "rewarded" ? `${icon("check")} Reward earned — tap × to continue` : "Tap × to continue"; } }, 1000);
    btn.addEventListener("click", () => { clearInterval(timer); o.classList.remove("open"); setTimeout(() => o.remove(), 250); resolve(n <= 0); });
  });
}
const testProvider = {
  name: "test", adsAvailable: true,
  showBanner(el) { // placeholder creative in the reserved strip (a real provider overlays a native banner here)
    const n = Math.floor(Date.now() / 30000) % 3;
    const copy = ["Ad · Your banner here", "Ad · 320×50 placement · test mode", "Ad · Replaced by the ad network in the app"][n];
    el.innerHTML = `<div class="banner-test"><span class="banner-tag">AD</span><span>${copy}</span></div>`;
  },
  hideBanner() {},
  async purchase(p) {
    return modal({ title: `Buy ${p.name}?`, html: `<div class="price-big">${priceLabel(p)}</div><p>${esc(p.desc)}</p><p class="fine">TEST MODE — nothing is charged. In the published app this is the App Store / Google Play purchase sheet.</p>`, ok: `Buy · ${priceLabel(p)}`, cancel: "Not now", iconName: "cash", tone: "gold" });
  },
  async restore() { return E.getState().purchases; },
  async rewardedAd() { return testAd("rewarded"); },
  async interstitial() { return testAd("interstitial"); }
};
const provider = () => window.IdleTraderBilling || testProvider;

// ---------- purchases ----------
export async function buy(productId) {
  const p = productById(productId); if (!p) return false;
  const s = E.getState();
  if (E.ownsProduct(p, s)) { toast(p.kind === "noads" ? "Ads are already removed." : `You already own the ${p.name}.`); return false; }
  let ok = false;
  try { ok = await provider().purchase(p); } catch (e) { console.warn("purchase failed", e); toast("The store didn't respond. Please try again."); return false; }
  if (!ok) return false;
  E.applyPurchase(p.id); sfx.success();
  toast(p.kind === "cash" ? `+${fmt(E.cashPackAmount(p))} added to your balance!` : p.kind === "noads" ? "Ads removed. Thank you!" : `${p.name} is yours — thank you!`, "good");
  return true;
}
export async function restore() {
  try { const ent = await provider().restore(); E.restorePurchases(ent || {}); toast("Purchases restored.", "good"); return true; }
  catch (e) { console.warn(e); toast("Couldn't reach the store to restore purchases."); return false; }
}

// ---------- ads ----------
export const adsAvailable = () => !!provider().adsAvailable;
let adBusy = false;
export async function watchRewarded(reward) { // reward: "boost" | "offline"
  if (adBusy || !adsAvailable()) return false;
  adBusy = true;
  try {
    const earned = await provider().rewardedAd();
    if (!earned) { toast("Watch the whole ad to earn the reward."); return false; }
    if (reward === "boost") { E.startBoost(); sfx.success(); toast(`${ADS.boost.mult}× earnings for ${ADS.boost.minutes} minutes!`, "good"); }
    else if (reward === "cash") { const got = E.grantFreeCash(); sfx.coin(); toast(`Free cash: +${fmt(got)}!`, "good"); }
    else if (reward === "offline") { const got = E.doubleOffline(); sfx.coin(); toast(`Offline earnings doubled: +${fmt(got)}!`, "good"); }
    return true;
  } catch (e) { console.warn("ad failed", e); toast("No ad available right now."); return false; }
  finally { adBusy = false; }
}
export async function maybeInterstitial() {
  if (adBusy || !E.interstitialDue() || !adsAvailable()) { if (E.getState().pendingInterstitial) E.markInterstitial(false); return false; }
  adBusy = true;
  try { const shown = await provider().interstitial(); E.markInterstitial(!!shown); return !!shown; }
  catch (e) { E.markInterstitial(false); return false; }
  finally { adBusy = false; }
}

// ---------- banner ----------
// The strip is part of the page layout so the game never hides behind a native banner. Remove-ads owners get no strip.
let bannerShown = false;
export function syncBanner() {
  const el = document.getElementById("banner"), app = document.getElementById("app"); if (!el || !app) return;
  const want = ADS.banner && adsAvailable() && !E.getState().purchases.noAds;
  if (want) { try { provider().showBanner(el); } catch (e) { console.warn("banner", e); } }
  else if (bannerShown) { try { provider().hideBanner(); } catch (e) { /* ignore */ } el.innerHTML = ""; }
  el.hidden = !want; app.classList.toggle("has-banner", want); bannerShown = want;
}
