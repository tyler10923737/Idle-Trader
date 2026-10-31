/* native.js — connects the game to the phone when it runs inside the Capacitor app.
 *
 * On the plain web this file does nothing (the game keeps its test providers). Inside the iOS / Android app,
 * Capacitor exposes every installed plugin on window.Capacitor.Plugins, and this file wires them to the two
 * hooks the game looks for:
 *   window.IdleTraderBilling — purchases (RevenueCat) and ads (AdMob)      → see js/monetize.js
 *   window.IdleTraderNative  — notifications, haptics, review, share, links → see js/device.js
 *
 * Setup (from the idle-trader folder):
 *   npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
 *   npm i @capacitor/local-notifications @capacitor/haptics @capacitor/share @capacitor/browser @capacitor/app
 *   npm i @capacitor-community/in-app-review @capacitor-community/admob @revenuecat/purchases-capacitor
 *   npx cap sync
 * Then fill in CONFIG below with your own ids (SHIP.md walks through where each one comes from).
 */
(function () {
  const C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) return;
  const P = C.Plugins || {};
  const ios = C.getPlatform() === "ios";

  const CONFIG = {
    revenueCat: { ios: "", android: "" },                 // RevenueCat public SDK keys (Project → API keys)
    admob: {                                              // AdMob ad unit ids (App → Ad units). Test ids are fine during development.
      ios: { banner: "ca-app-pub-3940256099942544/2934735716", interstitial: "ca-app-pub-3940256099942544/4411468910", rewarded: "ca-app-pub-3940256099942544/1712485313" },
      android: { banner: "ca-app-pub-3940256099942544/6300978111", interstitial: "ca-app-pub-3940256099942544/1033173712", rewarded: "ca-app-pub-3940256099942544/5224354917" },
      testing: true                                       // set false for release builds
    },
    entitlements: { noAds: "noads", items: { phantom: "phantom", skyvilla: "skyvilla", mint: "mint" } } // RevenueCat entitlement ids
  };
  const units = ios ? CONFIG.admob.ios : CONFIG.admob.android;
  const log = (...a) => console.log("[native]", ...a);

  // ---------------- purchases + ads ----------------
  let adsReady = false, rcReady = false;
  async function initAds() {
    if (!P.AdMob) return;
    try {
      if (ios && P.AdMob.requestTrackingAuthorization) await P.AdMob.requestTrackingAuthorization(); // App Tracking Transparency prompt
      await P.AdMob.initialize({ initializeForTesting: CONFIG.admob.testing, testingDevices: [] });
      try { const info = await P.AdMob.requestConsentInfo(); if (info && info.isConsentFormAvailable && info.status === "REQUIRED") await P.AdMob.showConsentForm(); } catch (e) { log("consent", e); } // GDPR / UMP
      adsReady = true;
    } catch (e) { log("admob init failed", e); }
  }
  async function initPurchases() {
    const key = ios ? CONFIG.revenueCat.ios : CONFIG.revenueCat.android;
    if (!P.Purchases || !key) return;
    try { await P.Purchases.configure({ apiKey: key }); rcReady = true; } catch (e) { log("revenuecat init failed", e); }
  }
  const entitlementsOf = info => {
    const active = (info && info.entitlements && info.entitlements.active) || {};
    const items = {}; Object.entries(CONFIG.entitlements.items).forEach(([id, ent]) => { if (active[ent]) items[id] = true; });
    return { noAds: !!active[CONFIG.entitlements.noAds], items };
  };
  window.IdleTraderBilling = {
    get adsAvailable() { return adsReady; },
    async purchase(product) {
      if (!rcReady) throw new Error("Billing not configured");
      const { products } = await P.Purchases.getProducts({ productIdentifiers: [product.id] });
      if (!products || !products.length) throw new Error("Product not found in the store: " + product.id);
      const r = await P.Purchases.purchaseStoreProduct({ product: products[0] });
      if (product.kind === "cash") return !!r;                         // consumable: the store confirmed the charge
      const ent = entitlementsOf(r && r.customerInfo);
      return product.kind === "noads" ? ent.noAds : !!ent.items[product.item];
    },
    async restore() { if (!rcReady) return {}; const { customerInfo } = await P.Purchases.restorePurchases(); return entitlementsOf(customerInfo); },
    async rewardedAd() {
      if (!adsReady) return false;
      let earned = false;
      const h = await P.AdMob.addListener("onRewardedVideoAdReward", () => { earned = true; });
      try { await P.AdMob.prepareRewardVideoAd({ adId: units.rewarded, isTesting: CONFIG.admob.testing }); await P.AdMob.showRewardVideoAd(); }
      finally { h.remove(); }
      return earned;
    },
    async interstitial() {
      if (!adsReady) return false;
      await P.AdMob.prepareInterstitial({ adId: units.interstitial, isTesting: CONFIG.admob.testing }); await P.AdMob.showInterstitial(); return true;
    },
    async showBanner(el) { // the native banner overlays the strip the page reserves at the bottom
      if (!adsReady) return; el.innerHTML = "";
      await P.AdMob.showBanner({ adId: units.banner, adSize: "BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: CONFIG.admob.testing });
    },
    async hideBanner() { if (adsReady) await P.AdMob.removeBanner(); }
  };

  // ---------------- notifications, haptics, review, share, links ----------------
  window.IdleTraderNative = {
    notifications: {
      async permission() { if (!P.LocalNotifications) return false; const r = await P.LocalNotifications.requestPermissions(); return r && r.display === "granted"; },
      async schedule(list) {
        if (!P.LocalNotifications || !list.length) return;
        const perm = await P.LocalNotifications.checkPermissions(); if (!perm || perm.display !== "granted") return;
        await P.LocalNotifications.schedule({ notifications: list.map(n => ({ id: n.id, title: n.title, body: n.body, schedule: { at: new Date(n.at) }, smallIcon: "ic_stat_icon", sound: undefined })) });
      },
      async cancelAll() { if (!P.LocalNotifications) return; const { notifications } = await P.LocalNotifications.getPending(); if (notifications && notifications.length) await P.LocalNotifications.cancel({ notifications }); }
    },
    haptic(kind) {
      if (!P.Haptics) return;
      if (kind === "success") P.Haptics.notification({ type: "SUCCESS" }); else P.Haptics.impact({ style: kind === "medium" ? "MEDIUM" : "LIGHT" });
    },
    async requestReview() { if (!P.InAppReview) return false; await P.InAppReview.requestReview(); return true; },
    async share({ title, text }) { if (!P.Share) return false; await P.Share.share({ title, text, dialogTitle: title }); return true; },
    openUrl(url) { if (P.Browser) P.Browser.open({ url }); else window.open(url, "_blank"); }
  };

  initAds(); initPurchases();
  log("native bridge ready on", C.getPlatform());
})();
