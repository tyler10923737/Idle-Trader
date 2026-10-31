# Shipping Idle Trader — App Store, Google Play, ads and purchases

This is the order that works. Budget a weekend for the first build and up to a week of waiting on reviews.
Costs: Apple Developer Program **$99/year**, Google Play developer account **$25 once**. RevenueCat (purchases)
and AdMob (ads) are free to start. You need a **Mac with Xcode** for the iPhone build (Android builds anywhere).

Everything below assumes you're in the `idle-trader` folder on your computer with Node.js 18+ installed.

---

## 0. What's already done for you

- `ship.sh` — one command that installs everything, generates icons/splash, creates the iOS and Android projects and opens Xcode (Mac).
- `codemagic.yaml` — cloud builds for iOS and Android without a Mac (see the section right below).
- `tools/apply-native-config.js` — injects the AdMob app ids / tracking text into the generated native projects (runs in the cloud build).
- `www/native.js` — the bridge to AdMob, RevenueCat, notifications, haptics, review and share. Method names were checked against the
  current plugin packages (admob 8.2, purchases-capacitor 13.7, local-notifications 8.3). It ships with Google's test ad ids.
- `native/Info.plist.additions.xml` and `native/AndroidManifest.additions.xml` — the two config snippets the OS needs for ads.
- `store/` — store screenshots at the exact App Store (6.9", 6.5") and Google Play sizes, the Play feature graphic, the 1024 icon
  and `listing.md` with the name, subtitle, description, keywords, review notes — copy/paste.
- `www/privacy.html` — the privacy policy to fill in and host.

What only you can do (each is tied to your identity, payment details or a Mac): create the Apple and Google developer accounts,
create the AdMob and RevenueCat accounts, run the build in Xcode / Android Studio, and press Submit.

## No Mac? Build in the cloud (works from Windows, or just your phone + a browser)

Apple only lets Xcode on a Mac produce an iPhone build — but the Mac doesn't have to be yours. **Codemagic** (codemagic.io) runs
Xcode on its own Macs, free for 500 build minutes a month (an Idle Trader build takes ~10–15), and uploads straight to TestFlight
and the App Store. Android never needed a Mac. `codemagic.yaml` in this folder is already written for both.

1. Put the project on **GitHub** (free): create a repository, upload this folder (GitHub Desktop on Windows, or drag-and-drop
   in the browser).
2. Sign up at codemagic.io with that GitHub account and add the repository.
3. In App Store Connect → Users and Access → Integrations → **App Store Connect API**: create a key (role *App Manager*), download
   the `.p8` file. In Codemagic → Team settings → Integrations → **Developer Portal**, add it with the name **Idle Trader API key**.
   Codemagic uses it to create your certificates and provisioning profiles automatically — no Xcode, no Keychain.
4. In Codemagic → your app → Environment variables, add group `app_store` with `APP_STORE_APPLE_ID` = the numeric Apple ID of
   the app record (App Store Connect → App Information → General).
5. For Android: Codemagic → Code signing identities → Android keystores → **Generate** one named `idle_trader_keystore`
   (download and back it up), and add group `google_play` with `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` = the service-account JSON
   from Play Console → Setup → API access.
6. Fill in `native/native-config.json` (AdMob app ids) and `www/native.js` (ad unit ids, RevenueCat keys), push, then in Codemagic
   press **Start new build → ios-release**. Fifteen minutes later the build is in TestFlight; install the TestFlight app on your
   iPhone and play it. `android-release` does the same to the Play internal track.
7. Everything else (store listing, products, screenshots, privacy policy, pressing Submit) is done in the web consoles — sections
   2–6 below — from any browser, including your phone.

Alternatives: GitHub Actions also offers macOS runners (free for public repositories), and MacStadium / MacinCloud rent a cloud Mac
by the month if you ever want to use Xcode directly.

## 1. One-time setup on your computer (if you do have a Mac)

```bash
bash ship.sh                 # does all of the below in one go (Mac). Or step by step:
npm run cap:plugins          # installs Capacitor + every plugin the game uses (ads, purchases, notifications, haptics, share, review, browser)
npm run cap:assets           # turns www/icons/icon-1024.png into all app icons and splash screens
npx cap add ios              # creates ios/   (Mac only)
npx cap add android          # creates android/
npx cap sync                 # copies www/ into both native projects and links the plugins
```

Before publishing change the app id `com.idletrader.app` in `capacitor.config.json` to your own reverse-domain id
(e.g. `company.cdp.idletrader`) — it can never be changed after release. Run `npx cap sync` again after editing it.

**Run on your own phone first:** `npx cap open ios` → in Xcode pick your iPhone and press ▶ (sign in with your Apple ID under
*Signing & Capabilities* → Team). Android: `npx cap open android` → ▶ with a phone in developer mode plugged in.
Because `native.js` ships with AdMob's *test* ad unit ids, you'll see real test ads immediately; purchases say "Billing not
configured" until step 4.

## 2. Google AdMob (ads)

1. Create an account at admob.google.com (needs a Google account; AdSense payment details come later).
2. **Apps → Add app** twice: one iOS app, one Android app. Each gets an **App ID** (`ca-app-pub-…~…`).
3. In each app, **Ad units → Add ad unit**, create three: *Banner*, *Interstitial*, *Rewarded*. Copy the three unit ids (`ca-app-pub-…/…`).
4. Paste them into `www/native.js` → `CONFIG.admob.ios` / `.android`, and set `testing: false` for the store build.
5. Put the **App IDs** where the OS needs them — the snippets are ready in `native/`:
   - iOS: paste `native/Info.plist.additions.xml` into `ios/App/App/Info.plist` (replace the test App ID with yours and add Google's
     SKAdNetwork list from https://developers.google.com/admob/ios/ios14#skadnetwork).
   - Android: paste `native/AndroidManifest.additions.xml` into `android/app/src/main/AndroidManifest.xml` (replace the test App ID).
6. Later, once the apps are live, add an **app-ads.txt** file to your website (AdMob shows the two lines) and link the store listings
   to the AdMob apps — otherwise ad fill is throttled.

Payouts: AdMob pays monthly once you pass $100, to the bank account you enter in AdMob → Payments.

## 3. RevenueCat (purchases, both stores through one API)

1. Create a project at app.revenuecat.com, add an **iOS app** (needs your App Store Connect app's bundle id and an
   *In-App Purchase Key* from App Store Connect → Users and Access → Integrations → In-App Purchase) and an **Android app**
   (needs the Play Console service-account JSON; RevenueCat's setup page walks through it).
2. **Products**: add the seven product ids exactly as in `www/js/data.js`:
   `premium_car`, `premium_home`, `premium_biz`, `noads` (non-consumables) and `cash_s`, `cash_m`, `cash_l` (consumables).
   They have to exist in both stores first (steps 5 and 6).
3. **Entitlements**: create `phantom`, `skyvilla`, `mint` and `noads`, and attach the matching non-consumable product to each.
   (The cash packs need no entitlement — the game grants them on a successful charge.)
4. Copy the two **public SDK keys** (Project settings → API keys) into `www/native.js` → `CONFIG.revenueCat.ios` / `.android`.

## 4. The privacy policy (required by both stores because of ads + purchases)

Edit `www/privacy.html` (replace the [brackets]) and host it anywhere public — your cdp.company site works. Paste the URL into
`STORE.privacyUrl` in `www/js/data.js` so the in-game link points at the hosted copy, and into both store listings.

## 5. Apple App Store

1. Join the Apple Developer Program at developer.apple.com ($99/year; takes a day or two to approve).
2. **App Store Connect → My Apps → +**: name *Idle Trader*, bundle id = your app id, SKU anything.
3. **In-App Purchases** (left menu): create the seven products with the same ids as above. Set the prices
   ($2.99 / $1.99 / $4.99 / $9.99), a display name and a screenshot of the Shop for each (App Review needs it).
4. **App Information / App Privacy**: age rating (answer the questionnaire — "infrequent/mild simulated gambling" is **not**
   needed; this is a tycoon game, no gambling), the privacy policy URL, and the privacy "nutrition label": declare
   *Identifiers (Device ID)* and *Usage data* used for *Third-party advertising* (AdMob), and *Purchases* linked to you via RevenueCat.
5. In Xcode: *Signing & Capabilities* → add **In-App Purchase**; *Push Notifications* is **not** needed (reminders are local).
   Set the version (`2.4.0`) and build number, choose *Any iOS Device*, then **Product → Archive → Distribute → App Store Connect → Upload**.
6. Back in App Store Connect: add the build to the version, upload the screenshots from `store/screenshots/iphone-6.9` (and the
   6.5" set if you want older phones covered), paste the name, subtitle, description, keywords and review notes from
   `store/listing.md`, add your support URL and the hosted privacy policy URL. Attach the sandbox tester account you created under
   Users and Access → Sandbox so the reviewer can test a purchase.
7. **TestFlight** first (same build, no review needed for internal testers): install on your phone, make a sandbox purchase, watch a
   rewarded ad, check the reminders fire after you close the app. Then **Submit for Review**. First reviews take 1–3 days.

## 6. Google Play

1. Create a developer account at play.google.com/console ($25 once; identity verification takes a day).
2. **Create app** → fill the store listing from `store/listing.md`: screenshots from `store/screenshots/android-phone`, the 512 px icon
   (`www/icons/icon-512.png`), `store/feature-graphic-1024x500.png`, content rating questionnaire, **Data safety** form (declare
   device/advertising ID and purchase history, shared with Google AdMob / RevenueCat), privacy policy URL, and say the app contains
   ads and in-app purchases.
3. **Monetize → Products → In-app products**: create the seven products (same ids; mark the cash packs as consumable in RevenueCat,
   Play doesn't distinguish).
4. Build: `npx cap open android` → in Android Studio **Build → Generate Signed Bundle** (create a keystore and **back it up** —
   losing it means you can never update the app). Upload the `.aab` to **Internal testing** first, add your Google account as a
   tester, install from the Play link, test a purchase (Play uses license testers for free purchases: Setup → License testing).
5. Promote to **Production** and submit. First review usually takes a few days; expect a request to confirm the ads/data declarations.

## 7. After launch

- Replace the placeholder links in `www/js/data.js` → `STORE.appStoreUrl` / `playStoreUrl` so *Rate* and *Share* point at the listings, rebuild, resync, resubmit.
- RevenueCat's dashboard shows revenue per product; AdMob shows eCPM and fill per ad unit. The ad frequency lives in `ADS` in
  `www/js/data.js` (`interstitialEverySec`, the rewarded cooldowns) — tune it from the numbers you see.
- Keep the video ad: `tools/ad/` re-renders it with any new caption in one command (README section 8).

## Checklist before you press Submit

- [ ] App id changed from `com.idletrader.app`, `npx cap sync` run
- [ ] `native.js`: real AdMob unit ids, `testing: false`, RevenueCat keys
- [ ] AdMob App IDs in `native/native-config.json` (cloud build) or pasted into `Info.plist` / `AndroidManifest.xml` (Mac build)
- [ ] Seven products created in both stores and in RevenueCat; four entitlements
- [ ] `privacy.html` filled in and hosted; URL in both listings and in `STORE.privacyUrl`
- [ ] Icons/splash generated (`npm run cap:assets`), version bumped in `package.json`
- [ ] Tested on a real phone from TestFlight / Internal testing: purchase, restore, rewarded ad, interstitial, banner, reminders
- [ ] Keystore (Android) backed up somewhere safe
