// device.js — phone features behind one small interface, with web fallbacks.
//
// Inside the Capacitor app, www/native.js sets window.IdleTraderNative from the installed plugins:
//   { notifications: { permission() -> Promise<bool>, schedule(list) , cancelAll() },
//     haptic(kind), requestReview() -> Promise<bool>, share({title, text}) -> Promise<bool>, openUrl(url) }
// On the plain web the fallbacks below are used (vibration API, Web Share / clipboard, window.open), and
// scheduled notifications are simply skipped — browsers can't fire them for a closed tab.
import { ADS, STORE } from "./data.js";
import { prefs, savePrefs } from "./ui.js";

const native = () => window.IdleTraderNative || null;
export const isNative = () => !!native();

// ---------- haptics ----------
export function haptic(kind = "light") {
  try {
    if (native() && native().haptic) return native().haptic(kind);
    if (navigator.vibrate && prefs.haptics !== false) navigator.vibrate(kind === "success" ? [12, 40, 12] : kind === "medium" ? 16 : 8);
  } catch (e) { /* ignore */ }
}

// ---------- notifications ----------
// Planned when the app goes to the background, cancelled when it comes back. Three reminders:
// offline earnings ready (8 h, the cap), free-cash gift ready, and a "market is open" nudge after a day.
export async function notificationsPermission() {
  if (!native() || !native().notifications) return false;
  try { return !!(await native().notifications.permission()); } catch (e) { return false; }
}
export function planNotifications(s, income, offlinePct, fmt) {
  const now = Date.now(), list = [];
  if (prefs.notifications === false || !native() || !native().notifications) return list;
  if (income > 0) {
    const est = income * 8 * 3600 * offlinePct;
    list.push({ id: 1, at: now + 8 * 3600 * 1000, title: "Offline earnings ready", body: `Your empire made about ${fmt(est)} while you were away. Tap to collect.` });
  }
  const giftAt = s.freeCashAt || 0;
  if (giftAt > now + 60 * 1000 && giftAt < now + 24 * 3600 * 1000 && !s.purchases.noAds) list.push({ id: 2, at: giftAt, title: "Free cash is ready", body: "Your gift is waiting in Idle Trader." });
  list.push({ id: 3, at: now + 24 * 3600 * 1000, title: "The market is open", body: "Your trader is waiting — come make a deal." });
  return list;
}
export async function scheduleNotifications(list) { try { if (native() && native().notifications) await native().notifications.schedule(list); } catch (e) { console.warn("notifications", e); } }
export async function cancelNotifications() { try { if (native() && native().notifications) await native().notifications.cancelAll(); } catch (e) { /* ignore */ } }

// ---------- app-store review ----------
// Native: the system rating prompt (Apple/Google limit how often it really appears). Web: nothing to rate yet.
export async function requestReview() {
  prefs.reviewAskedAt = Date.now(); prefs.reviewAsks = (prefs.reviewAsks || 0) + 1; savePrefs();
  try { if (native() && native().requestReview) return !!(await native().requestReview()); } catch (e) { console.warn("review", e); }
  return false;
}
export function reviewDue() {
  const last = prefs.reviewAskedAt || 0;
  return (prefs.reviewAsks || 0) < 3 && Date.now() - last > 30 * 24 * 3600 * 1000;
}
export const storeUrl = () => (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? STORE.appStoreUrl : STORE.playStoreUrl) || STORE.appStoreUrl || STORE.playStoreUrl || "";

// ---------- share ----------
export async function share(text, title = "Idle Trader") {
  try {
    if (native() && native().share) return !!(await native().share({ title, text }));
    if (navigator.share) { await navigator.share({ title, text }); return true; }
    if (navigator.clipboard) { await navigator.clipboard.writeText(text); return "copied"; }
  } catch (e) { if (e && e.name === "AbortError") return false; console.warn("share", e); }
  return false;
}

// ---------- links ----------
export function openUrl(url) {
  if (!url) return;
  try { if (native() && native().openUrl) return native().openUrl(url); } catch (e) { /* fall through */ }
  window.open(url, "_blank", "noopener");
}
export const adsConfigured = () => ADS.banner !== undefined;
