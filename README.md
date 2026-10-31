# Idle Trader — colorful 3D tycoon edition (v2.4)

A playable mobile-first tycoon / life-and-wealth simulator built with plain HTML, CSS and JavaScript.
It runs in any modern browser and is set up to be wrapped as an iPhone and Android app with Capacitor.
Virtual in-game currency only: no real-money trading, prizes or withdrawals.

```
idle-trader/
├── www/                     ← the game (this folder is what gets packaged into the native apps)
│   ├── index.html           app shell (HUD, scenes container, bottom navigation)
│   ├── style.css            theme: cyan/blue/purple panels, gold buttons, iPhone safe areas, animations
│   ├── app.js               bootstrap: builds the shell, wires scenes, HUD and global events
│   ├── firebase-config.js   OPTIONAL cloud save config (disabled by default)
│   ├── native.js            phone bridge: inside the Capacitor app it wires AdMob, RevenueCat, notifications, haptics, review, share
│   ├── privacy.html         privacy policy template (host it and link it from both store listings)
│   ├── manifest.webmanifest + icons/   home-screen icon / app icons (1024px icon for the stores)
│   ├── fonts/               Fredoka + Nunito, bundled (SIL Open Font License)
│   └── js/
│       ├── economy.js       game state, trade/offline/prestige math, local autosave  (logic carried over from the original)
│       ├── monetize.js      purchases + ads behind one provider interface (test provider on the web)
│       ├── device.js        notifications, haptics, store review, share, links — native via native.js, web fallbacks otherwise
│       ├── data.js          upgrades, vehicles, properties, businesses, mentors, outfits, deals
│       ├── iso.js           tiny 3D engine: orthographic camera (yaw/pitch), lit faces, depth sorting, decals, SVG + canvas renderers
│       ├── models.js        3D models: cars (extruded from the side profiles), turntable, buildings, businesses
│       ├── office3d.js      the office as a 3D room (walls, desk, monitors, shelves, window, door, character sprite)
│       ├── scenes3d.js      composes 3D scenes: asset cards, neighborhood/district strips, parking tiles, canvas showroom
│       ├── art.js           2D art: gradients, character & props sprites, icons, the car side profiles
│       ├── ui.js            toast, bottom sheet, modal, coin/confetti effects, synthesized sound effects
│       ├── cloud.js         optional Firebase cloud save (only loaded when you enable it)
│       ├── router.js        tiny navigation handle shared by scenes
│       └── scenes/          office.js · garage.js · collection.js (Homes + Business) · profile.js
├── tools/
│   ├── smoke-test.py        automated end-to-end test (Playwright, iPhone viewport)
│   ├── pacing-sim.py        greedy-player simulation used to tune the economy (how long the game takes)
│   ├── ad/                  video ad: ad.html (built from the game's art), render-ad.py (frames → MP4), music.py (original synth music bed)
│   └── art-preview.html     renders every car / building / character / office tier on one page
├── original/                the starter prototype files, kept for reference
├── SHIP.md                  step-by-step: App Store, Google Play, AdMob, RevenueCat, privacy policy (with and without a Mac)
├── codemagic.yaml           cloud builds (iOS + Android) — no Mac needed
├── ship.sh                  one-command native setup on a Mac
├── store/                   store screenshots at App Store / Play sizes, feature graphic, listing text
├── capacitor.config.json    native wrapper settings (change appId before publishing)
├── package.json             handy scripts
└── CLAUDE_HANDOFF.md        the product brief this version was built from
```

---

## 1. Preview on your computer (2 minutes)

The game uses JavaScript modules, so it must be served by a local web server (double-clicking `index.html` will not work).

**Option A — Python (Mac / Windows / Linux)**
1. Open Terminal (Mac) or Command Prompt (Windows) and go into the `idle-trader` folder, e.g. `cd ~/Downloads/idle-trader`
2. Run **one** of these:
   - Mac/Linux: `python3 -m http.server 8000 --directory www`
   - Windows: `py -m http.server 8000 --directory www`
3. Open **http://localhost:8000** in Chrome, Safari or Edge.
4. For a phone-like view in Chrome: press F12 → click the "device toolbar" icon → pick *iPhone 14 Pro*.

**Option B — VS Code**
1. Open the `idle-trader` folder in Visual Studio Code and install the *Live Server* extension.
2. Right-click `www/index.html` → **Open with Live Server**.

**Option C — Node**: `npx --yes serve www -l 8000` then open http://localhost:8000.

## 2. Preview on your iPhone over Wi-Fi (no packaging needed)

1. Start the server as in step 1 (Option A).
2. Find your computer's local IP address (Mac: System Settings → Wi-Fi → Details; Windows: `ipconfig`), e.g. `192.168.1.25`.
3. On the iPhone (same Wi-Fi network) open Safari and go to `http://192.168.1.25:8000`.
4. Tap the Share button → **Add to Home Screen**. It launches full-screen with the app icon, like an app. Progress is saved on the phone.

To let other people try it, upload the **contents of `www/`** to any free static host (GitHub Pages, Netlify Drop, Cloudflare Pages) and share the link.

## 3. What to test (all of this is automated in `tools/smoke-test.py`, but it is fun by hand)

1. **Office** – you start with $0 at level 1: the first tap completes a starter task worth $10. Then tap *START TRADE*; each deal is a made-up ticker (ZPHR, QBYT, LUMX…). Watch the progress bar; coins fly to your balance and XP fills the bar in the top bar. Levels unlock new cars, homes, businesses, mentors and upgrades (a level-up screen lists them).
2. **Upgrades** – tap the desk (or *Upgrades*). Each level changes the room: bigger desk, more monitors, better chair, plants, ticker board, server rack, bookshelf…
3. **Tap-to-travel** – tap the **garage door** in the office to go to the Garage, tap the **window** to go to your properties, or use the bottom bar.
4. **Garage** – use the arrows (or swipe) to browse 25 cars on the turntable (including four exotics — a red Italian-style mid-engine car with quad tail lights, a lime wedge with a black roof and angular intakes, a papaya hypercar with a dihedral door line and light bar, a silver long-hood grand tourer — and the premium black-and-gold Phantom GT; all original designs, no real brands); big **BUY** button; bought cars appear in *My Garage* parking spaces, survive navigation and reload. The garage holds **one of each car** (no selling). **Tune** (+20% income/level) and **Paint** (changes the car's color everywhere). **Expand** adds 4 spaces and upgrades the garage look (4 looks).
5. **Homes / Business** – 19 homes and 19 businesses. Owned items appear on your street / business district strip and in the *Owned* list; buying deducts cash and raises income per second. Businesses level up (each level costs 60% more). Properties can be renovated.
6. **Me** – outfits (the character changes in the office, showroom and HUD), mentors (recruit / equip / unequip — only one equipped; the equipped mentor stands in your office), prestige + legacy upgrades, sound toggle, **theme** (Ocean, Sunset, Forest, Midnight, Candy — a device setting, kept across resets), cloud save, backup code, reset.
7. **Offline earnings** – close the game for a while and come back: a *Welcome back* screen pays out income for up to 8 hours, at the Offline Network percentage.
8. **Prestige** – at $100K lifetime net worth, prestige from *Me*. Run progress resets; mentors, outfits and legacy upgrades stay.

**Test codes** (for trying things out; turn off with `DEV_CODES = false` in `www/js/economy.js` before a store release): in *Me → Backup / restore save*, clear the box, type a code and tap *Restore from code* — `MONEY` adds $1 million, `RICH` adds $1 billion, `LEVELUP` gives one level, `UNLOCKALL` jumps to level 24 (everything unlocked), `CARS` parks one of every car in your garage.

Run the automated test yourself (needs Python 3): `pip install playwright && playwright install chromium`, start the server on port 8000, then `python3 tools/smoke-test.py http://127.0.0.1:8000/`.

## 4. What changed from the starter project

- **Changed on request (v1.2–v2.1)**: the run starts with $0 and a $10 starter task (as in the original); deals are named after fictional tickers; every run starts with a x1.50 trade multiplier; a **player level** with XP and level-gated unlocks was added (the top bar shows level + XP instead of net worth); and in v2.0 the content was more than doubled (58 things to own, 6 mentors, 8 outfits, deeper upgrades) and the economy re-tuned so that a player who plays about an hour a day needs roughly two weeks to own everything — through many small, cheap-ish steps rather than long waits.

### The economy curve (v2.0)
Tuned with the greedy-player simulation in `tools/pacing-sim.py` (`python3 tools/pacing-sim.py hour casual speedrun`):
- **Trading**: payout = stake × (1 + profit% × multiplier). Profit starts at 30%, the multiplier at x1.50. Trade time goes 8 → 6 → 4.5 → 3.5 → 2.5 → 1.8 → 1.2 → 0.6 s → **instant** (at the top Deal Optimization level deals complete as fast as you can tap). The four fastest speed levels need player levels 6 / 10 / 14 / 18, and trade XP is scaled by trade time, so tapping fast earns money but doesn't level you up faster. Upgrades come in many small steps (+4% profit, +0.08x, +10% stake per level) with level caps (speed 8, profit 20, capacity 20, multiplier 20, research 15), so no single purchase is make-or-break and active trading stays useful without carrying the late game.
- **Early buys are cheap**: Deal Optimization $15, Professional Setup $20, Trade Capacity $40, Profit Multiplier $150 — each level costs 1.5–2.5× the previous one.
- **Assets pay back slower the higher the tier**: ~4 min for the first car, ~1 h for the sedan (level 5), ~7 h for the muscle car (level 8), ~1 day for the limo (level 14), ~2 days for the final items (level 24). Cars are one of each; each extra copy of a property costs 60% more; each business level costs 60% more. Tune / renovate (+20% income per level) is a slightly better deal than a second copy.
- **Parallel Deals and Trade Automation** pay flat, saturating amounts (+$3 × 1.3^level and +$5 × 1.35^level per level) — a steady floor that no multiplier stacks on.
- The asset trade bonus counts each asset *type* once and caps at +150%.

How long it takes (simulated, greedy buyer; real players are a bit slower):

| Milestone | 1 h / day (2 × 30 min) | 3 × 10 min / day | Non-stop |
|---|---|---|---|
| First car | 11 min | first session | 11 min |
| Level 10 | 12 h | 16 h | 34 min |
| Supercar (level 13) | day 2 | day 2 | 3 h |
| Level 20 | day 5 | day 5 | 8 h |
| Level 24 — last unlock | day 9 | day 9 | 23 h |
| Own one of everything | day 11 | day 10 | 4.6 days |

A new item becomes affordable at least once a day all the way through (longest gap ≈ 24 h).

### Levels & unlocks
- XP comes from every completed trade, every purchase, and from passive income every second (at half rate while you're away). XP to the next level grows 1.3× per level (100, 130, 169 …): level 5 arrives in the first quarter hour, level 10 on day one, level 24 around day nine for a one-hour-a-day player.
- Owning one of everything triggers an "Empire complete" screen; after that the game is open-ended (levels up to 40, prestige for Legacy Points).
- Something new unlocks at **every** level from 1 to 24 (2–3 items per level): cars 1/2/3/4/5/6/7/8/9/10/11/12/13/14/15/17/19/21/22/23 · homes 1/2/3/4/6/7/8/9/11/12/14/16/18/19/20/21/23/24/24 · businesses 1/2/3/5/6/8/9/10/12/14/16/18/20/20/22/23/23/24/24 · mentors 2/5/8/11/14/18 · outfits 1/3/7/10/13/16/20/24 · upgrades: capacity 2, multiplier 4, offline 5, parallel deals 6, automation 8, research 10. Locked items stay visible with a "Level N" tag.
- Level and XP survive prestige. Saves made before levels existed get a level estimated from what they earned and own, so nothing already owned becomes locked.
- **Kept**: the structure of the economy (trade payouts, upgrades, assets with income/value/trade bonus, mentor multipliers, legacy upgrades, offline earnings capped at 8 h, prestige), the save key (`idleTraderSaveV1`, so existing saves load — their items, levels and cash carry over into the re-tuned curve), optional Firebase cloud save. It lives in `www/js/economy.js` + `data.js` instead of one big `app.js`.
- **New gameplay layers**: 25 vehicles, 20 properties, 20 businesses (three of them premium) (all of the original items are still there under their original ids, so old saves keep them), garage spaces + expansion, per-car tune & paint, property renovation, business levels with scaling cost, 6 mentors, 8 outfits, office tiers (5) and garage looks (5) that change with progress.
- **New presentation**: scene-based layout with a persistent bottom bar, a 3D office room with the character at the desk, a 3D car turntable you can spin, 3D buildings on the property / business cards and the neighborhood and business-district strips, coin / confetti effects, synthesized sound, welcome-back screen, backup & restore codes.
- **Detail pass (v2.1)**: cars have wheel arches, panel seams, grille slats, badge, plates, fog lights, exhaust tips, belt-line trim and door seams at every pillar; characters have a belt, cuffs, a watch, shoe soles and outfit-specific buttons / pocket / lapel details; every building window gets a frame, sill and glint, gable roofs get shingle courses and a ridge cap. All of it is generated in `js/models.js` / `js/art.js` — no image files.
- **Level-up bonuses (v2.1)**: every level pays a cash bonus (about a quarter of the cheapest thing that unlocks there: $238 at level 2, ~$40K at level 10, ~$1M at level 15, ~$25M at level 20); the level-up screen shows it and *Me* shows the next one. Runs start at **$0** again — the first tap is a starter task worth $10, and it comes back whenever you're broke with no income (so a fresh prestige can't get stuck). *Head Start* now gives $100 of starting cash per legacy level.
- **Renderer fix (v2.1)**: decals (windows, lights, seams, vents) are depth-sorted with the face they sit on, so they no longer vanish on the far half of a wall or bumper at some camera angles.
- **3D without a 3D library**: `js/iso.js` is a ~200-line software renderer (orthographic camera, flat shading, painter's sorting). Models are built from boxes, prisms and the cars' side profiles, then drawn as SVG polygons (static scenes) or on a `<canvas>` (the turntable, ~60 polygons per car, a few ms per frame). No WebGL, no textures to download, nothing to license.
- **Save migration**: new fields (`garageLevel`, `mods`, `paints`, `outfit`, `unlockedOutfits`, `legacyClaimed`) get safe defaults; a save with more cars than parking spaces gets free spaces.
- **Fixes**: Firebase is now loaded only when configured (the old static import broke the game whenever the Firebase CDN was unreachable); prestige can no longer be repeated immediately for the same Legacy Points; offline earnings are also applied when the app returns from the background on a phone, not only on a full reload.

## 5. Package it for iPhone and Android (Capacitor — free, open source)

Capacitor wraps the `www/` folder in a native app. One project, both platforms.

**You need**
- Node.js 18+ (https://nodejs.org)
- iPhone: a Mac with Xcode (free from the Mac App Store). Running on your own iPhone is free; publishing on the App Store needs the Apple Developer Program (US$99/year).
- Android: Android Studio (free). Publishing on Google Play needs a one-time US$25 developer registration.

**Steps** (run inside the `idle-trader` folder)
1. `npm install @capacitor/core @capacitor/cli` — installs Capacitor (the config file `capacitor.config.json` is already here; **edit `appId`** to your own reverse-domain id, e.g. `com.yourcompany.idletrader`, before you publish).
2. iPhone: `npm install @capacitor/ios` then `npx cap add ios` → `npx cap sync ios` → `npx cap open ios` (opens Xcode). In Xcode select your iPhone as the target, set your team under *Signing & Capabilities*, and press Run.
3. Android: `npm install @capacitor/android` then `npx cap add android` → `npx cap sync android` → `npx cap open android` (opens Android Studio). Press Run on a connected phone or emulator.
4. Every time you change files in `www/`, run `npx cap sync` and run again from Xcode / Android Studio.
5. App icons & splash: install `@capacitor/assets` (`npm install -D @capacitor/assets`), put a 1024×1024 icon at `assets/icon.png` (you can use `www/icons/icon-1024.png`) and run `npx capacitor-assets generate`.
6. Nice-to-have plugins (all free): `@capacitor/status-bar` (dark status bar), `@capacitor/haptics` (vibration on purchases), `@capacitor/preferences` (hardened save storage — the game currently uses the browser's localStorage, which works inside the app but the Preferences plugin is more robust on iOS). Lock the app to portrait in Xcode (General → Deployment Info) and in `AndroidManifest.xml` (`android:screenOrientation="portrait"`).
7. Store release: archive in Xcode → App Store Connect; generate a signed bundle in Android Studio → Google Play Console. Both stores require screenshots, a privacy policy URL and an age rating. The game is a simulation with virtual currency only; declare that it contains no real-money gambling.

**Not done yet / not claimed**: this folder is a web app plus packaging configuration. Nothing has been signed, submitted or reviewed by either store.

## 6. Optional cloud saves (Firebase, free tier)

Local saves work out of the box. Cloud sync needs your own Firebase project (free Spark plan is enough for a hobby game):
1. https://console.firebase.google.com → create a project → add a **Web app** → copy its config.
2. *Authentication → Sign-in method*: enable **Email/Password**. Create a **Firestore Database**.
3. Open `www/firebase-config.js`, set `enabled: true` and paste `apiKey`, `authDomain`, `projectId`, `appId`.
4. Firestore rules (authenticated users can only read/write their own save):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /saves/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
     }
   }
   ```
5. In the game: *Me → Cloud save* → sign in → *Sync save now*. Signing in on another device offers to load the cloud save.
The sync is a simple starter implementation (last write wins). For a public release add Firebase App Check and a privacy policy, and never ship service-account credentials in the app.

## 6b. Release features (v2.4)

- **Daily bonus**: from the second day on, the first open of the day pays 5 minutes of income (min $50), growing +25% per consecutive day up to day 7 (2.5×); a missed day resets the streak. A calendar-style screen shows the streak.
- **Reminders** (local notifications, in the app): when the game goes to the background it schedules *offline earnings ready* (8 h), *free cash is ready* (when the gift cooldown ends) and *the market is open* (24 h); they're cancelled when you come back. Toggle in *Me → Reminders*. The permission prompt appears after level 3.
- **Rate the game**: the system review prompt (Apple/Google's own, which they rate-limit) at a happy moment — reaching level 8, completing the collection, or prestiging — at most 3 times, 30 days apart; plus a *Rate* row in settings. On the web it's a soft prompt only.
- **Share my empire**: share sheet with your level, rank, net worth and collection counts (clipboard fallback on desktop).
- **Vibration**: light haptics on trades and purchases, a success pattern on level-ups (toggle in settings).
- **Privacy policy** link in settings (`www/privacy.html`, a template to fill in and host).
- Everything native goes through `www/native.js` → see **SHIP.md** for the store walkthrough.

## 7. Making money: in-app purchases and ads

The game has a real-money layer, built so the game logic never touches a store directly:

- **Shop** (the gold **+** next to your cash, or *Me → Shop*): three **premium items at $2.99** — *Phantom GT* (car), *Sky Villa* (home), *The Mint* (business). Each is the last entry in its list, available from **level 1**, and deliberately strong: a big trade-profit bonus (+30–40%), a unique perk (the villa adds +25% offline earnings, the Mint +20% to all passive income) and passive income that **grows with your level** ($2–4/sec at level 1, ~$80–150/sec at level 10, ~$4–9K/sec at level 20), so they stay valuable all game. They can't be sold, are kept across resets and prestige, and the premium car doesn't use a garage space. Also: **Remove ads** ($2.99) and three **cash packs** ($1.99 / $4.99 / $9.99 = 2 / 8 / 24 hours of your current income, with minimums).
- **Banner**: a 50 px strip at the very bottom (below the navigation) that the native build fills with an AdMob banner; in test mode it shows a placeholder. Gone for Remove-ads owners (the layout reflows).
- **Rewarded ads** (always optional, offered often, each a modest help): a floating **Free cash** gift every 10 minutes worth 3 minutes of your income (min $25), *Watch an ad → 2× all earnings for 5 minutes* in the office (watch again to extend, up to 15 minutes), and *double your offline payout* on the welcome-back screen.
- **Interstitials**: one every **3 minutes of play** (foreground time, so leaving the app doesn't count), shown at the next quiet second — never on top of a dialog, sheet or another ad — plus one when coming back after a 5-minute break. None before level 3 (about 10 minutes in), none for players who bought Remove ads. All of this is numbers in `ADS` in `www/js/data.js`.
- Entitlements are stored in `localStorage` key `idleTraderPurchases` (separate from the save) and re-applied on every load, so a reset or a new save never loses a purchase.

### Test mode vs. real money
Out of the box the game runs in **test mode**: purchases show a sheet that says nothing is charged, ads are a 5-second placeholder. That's so the whole flow can be played and tested in a browser. Real money only flows inside the native apps, through the platforms' own billing:

1. Package the app with Capacitor (section 5) and create the products in **App Store Connect** and **Google Play Console** with the same ids as `PRODUCTS` in `www/js/data.js` (`premium_car`, `premium_home`, `premium_biz`, `noads`, `cash_s`, `cash_m`, `cash_l`); the first four as *non-consumables*, the cash packs as *consumables*.
2. Install a billing plugin — the simplest free option is **RevenueCat** (`npm i @revenuecat/purchases-capacitor`; free until $2.5K/month revenue) — and an ads plugin, **AdMob** (`npm i @capacitor-community/admob`). Create a rewarded ad unit and an interstitial unit in AdMob.
3. `www/native.js` already does the wiring — fill in `CONFIG` (ad unit ids, RevenueCat keys) and it sets `window.IdleTraderBilling` whenever the game runs inside Capacitor. For reference, this is the shape it builds:

```js
// native-billing.js (example, RevenueCat + AdMob)
import { Purchases } from "@revenuecat/purchases-capacitor";
import { AdMob, RewardAdPluginEvents } from "@capacitor-community/admob";
await Purchases.configure({ apiKey: "<your RevenueCat public key>" });
await AdMob.initialize();
const entitlements = info => ({ noAds: !!info.entitlements.active.noads, items: Object.fromEntries(["phantom", "skyvilla", "mint"].filter(id => info.entitlements.active[id]).map(id => [id, true])) });
window.IdleTraderBilling = {
  adsAvailable: true,
  async purchase(product) { const { customerInfo } = await Purchases.purchaseProduct({ productIdentifier: product.id }); return product.kind === "cash" ? true : !!customerInfo; },
  async restore() { const { customerInfo } = await Purchases.restorePurchases(); return entitlements(customerInfo); },
  async rewardedAd() { let earned = false; const h = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earned = true; }); await AdMob.prepareRewardVideoAd({ adId: "<rewarded unit id>" }); await AdMob.showRewardVideoAd(); h.remove(); return earned; },
  async interstitial() { await AdMob.prepareInterstitial({ adId: "<interstitial unit id>" }); await AdMob.showInterstitial(); return true; },
  async showBanner(el) { await AdMob.showBanner({ adId: "<banner unit id>", adSize: "BANNER", position: "BOTTOM_CENTER", margin: 0 }); el.innerHTML = ""; }, // native banner overlays the reserved strip
  async hideBanner() { await AdMob.removeBanner(); }
};
```

The game calls `purchase` / `rewardedAd` and only grants the item when the provider resolves `true` (`js/monetize.js`). Nothing else in the game needs to change.

### Before you publish (not optional)
- Apple and Google take 15–30% of each purchase and require the products to be set up and approved in their consoles; RevenueCat and AdMob need accounts (free). Payouts come from Apple / Google / AdMob — the game never handles money itself.
- Store rules: a *Restore purchases* button (it's in the Shop and in *Me*), prices shown before buying (the store sheet does this), a privacy policy, the iOS **App Tracking Transparency** prompt and the **GDPR/UMP consent** form for AdMob, and a **privacy "nutrition label"** that declares ads and purchases. Mobile ad SDKs also need the app to be marked as not directed at children if you keep ads.
- The in-game money is virtual and stays virtual: the Shop says so, and nothing bought can be cashed out. Keep that text.
- This project has not been submitted or reviewed; budget time for the store review and the AdMob / RevenueCat setup.

## 8. The video ad

`tools/ad/ad.html` is a 23-second, 1080×1920 (9:16) ad assembled from the game's own art — title + spinning car, the office, a car parade, the homes and business strips, a level-up and a call to action. Open it in a browser and it plays on its own. To render the MP4 (with the original synth music bed from `music.py`):

```
pip install playwright && playwright install chromium        # once; ffmpeg must be on the PATH
python3 -m http.server 8000                                   # from the idle-trader folder
python3 tools/ad/render-ad.py http://127.0.0.1:8000/tools/ad/ad.html ad-out
```

That writes `ad-out/idle-trader-ad.mp4` (with music), a silent version, and two poster stills. Edit the captions in `ad.html` to change the copy; everything is a function of time (`window.renderAt(ms)`), so the render is identical on every machine.

## 9. Known limitations / ideas for the next version

- Balance numbers come from a simulation, not from real players; `tools/pacing-sim.py` makes re-tuning quick (edit the tables at the top, run it, copy the numbers into `www/js/data.js`).
- The 3D look is deliberately low-poly (flat-shaded boxes and prisms, no textures). If you ever want photoreal cars, the turntable in `js/scenes3d.js` can be swapped for a WebGL renderer (three.js, MIT) and glTF models — a bigger download and a licensing question for each model, which is why this version stays with generated geometry.
- The office camera angle is fixed (`OFFICE_CAM` in `js/office3d.js`); the turntable rotates the car, not the room.
- No music track (sound effects are synthesized, no audio files). A free OGG/MP3 loop can be added in `ui.js`.
- Cloud sync does not merge conflicting saves from two devices.
- Not yet reviewed against App Store / Google Play policies; do that before submitting.

## Credits & licenses
- Game code and all artwork: original, made for this project.
- Fonts: Fredoka and Nunito — SIL Open Font License 1.1 (see `www/fonts/LICENSE-*.txt`).
- Capacitor (MIT) and Firebase SDK (Apache-2.0) are used only when you install / enable them.
