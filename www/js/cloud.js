// Optional Firebase cloud save. Firebase is only downloaded (dynamic import) when the owner
// has filled in firebase-config.js and set enabled:true — so the game works fully offline
// and never depends on the network by default.
import { getState, replaceState, on, emit } from "./economy.js";

const cfg = (typeof window !== "undefined" && window.IDLE_TRADER_FIREBASE) || { enabled: false };
const FB = "https://www.gstatic.com/firebasejs/10.14.1/";
export const cloud = { ready: false, user: null, auth: null, db: null, fns: null };
export const isConfigured = () => !!(cfg.enabled && cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE"));
const say = msg => emit("cloud:message", msg);

export async function initCloud(confirmFn) {
  if (!isConfigured()) return false;
  try {
    const [appM, authM, dbM] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
    const app = appM.initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
    cloud.auth = authM.getAuth(app); cloud.db = dbM.getFirestore(app); cloud.fns = { ...authM, ...dbM }; cloud.ready = true;
    authM.onAuthStateChanged(cloud.auth, async user => {
      cloud.user = user; emit("cloud:status", { user });
      if (!user) return;
      say(`Signed in as ${user.email}. Use Sync save to upload or download your save.`);
      try {
        const snap = await dbM.getDoc(dbM.doc(cloud.db, "saves", user.uid));
        if (snap.exists()) {
          const cloudState = snap.data().game;
          if (cloudState && await confirmFn("A cloud save exists. Load it? Choose Keep to stay with this device's save.")) {
            replaceState(cloudState); emit("toast", "Cloud save loaded.");
          }
        }
      } catch (e) { say("Could not read cloud save: " + e.message); }
    });
    return true;
  } catch (e) { say("Firebase setup error: " + e.message); return false; }
}

export async function signIn(email, password) {
  if (!cloud.ready) { say("Firebase is not configured yet. Follow the setup instructions in firebase-config.js and README.md."); return false; }
  if (!email || password.length < 6) { say("Enter a valid email and a password of at least 6 characters."); return false; }
  const f = cloud.fns;
  try {
    try { await f.signInWithEmailAndPassword(cloud.auth, email, password); }
    catch (e) {
      if (e.code === "auth/invalid-credential" || e.code === "auth/user-not-found" || e.code === "auth/invalid-login-credentials") await f.createUserWithEmailAndPassword(cloud.auth, email, password);
      else throw e;
    }
    cloud.user = cloud.auth.currentUser; say("Signed in. Press Sync save to upload your current game."); emit("toast", "Cloud account connected."); return true;
  } catch (e) { say(e.message); return false; }
}

export async function syncCloud(show = true) {
  if (!cloud.ready || !cloud.user) { if (show) say("Sign in first, and ensure Firebase is configured."); return false; }
  const f = cloud.fns;
  try {
    await f.setDoc(f.doc(cloud.db, "saves", cloud.user.uid), { game: getState(), updatedAt: f.serverTimestamp() });
    say("Cloud save synced successfully."); if (show) emit("toast", "Cloud save synced."); return true;
  } catch (e) { say("Sync failed: " + e.message); return false; }
}

let timer = null;
on("queue-cloud", () => { if (cloud.ready && cloud.user) { clearTimeout(timer); timer = setTimeout(() => syncCloud(false), 1200); } });
