// Injects the AdMob app ids (and the iOS tracking prompt text) into the generated native projects.
// Idempotent: safe to run after every `npx cap add` / `npx cap sync`.   node tools/apply-native-config.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), cfg = JSON.parse(fs.readFileSync(path.join(root, "native/native-config.json"), "utf8"));
const plist = path.join(root, "ios/App/App/Info.plist"), manifest = path.join(root, "android/app/src/main/AndroidManifest.xml"), gradle = path.join(root, "android/app/build.gradle");
if (fs.existsSync(plist)) {
  let s = fs.readFileSync(plist, "utf8");
  const put = (key, value) => { const re = new RegExp(`<key>${key}</key>\\s*<string>[^<]*</string>`); const entry = `<key>${key}</key>\n\t<string>${value}</string>`; s = re.test(s) ? s.replace(re, entry) : s.replace(/<\/dict>\s*<\/plist>\s*$/, `\t${entry}\n</dict>\n</plist>\n`); };
  put("GADApplicationIdentifier", cfg.admobAppIdIos); put("NSUserTrackingUsageDescription", cfg.trackingDescription);
  if (!s.includes("SKAdNetworkItems")) s = s.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>SKAdNetworkItems</key>\n\t<array>\n\t\t<dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>\n\t</array>\n</dict>\n</plist>\n`); // Google's own network; add the rest of the list from Google's docs
  fs.writeFileSync(plist, s); console.log("Info.plist updated");
}
if (fs.existsSync(manifest)) {
  let s = fs.readFileSync(manifest, "utf8");
  const meta = `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${cfg.admobAppIdAndroid}"/>`;
  s = /com\.google\.android\.gms\.ads\.APPLICATION_ID/.test(s) ? s.replace(/<meta-data android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>/, meta) : s.replace(/<\/application>/, `    ${meta}\n    </application>`);
  if (!s.includes("com.google.android.gms.permission.AD_ID")) s = s.replace(/<\/manifest>/, `    <uses-permission android:name="com.google.android.gms.permission.AD_ID"/>\n</manifest>`);
  fs.writeFileSync(manifest, s); console.log("AndroidManifest.xml updated");
}
if (fs.existsSync(gradle)) { // release signing + version code from the CI build number (Codemagic sets CM_* and BUILD_NUMBER)
  let s = fs.readFileSync(gradle, "utf8");
  if (!s.includes("// idle-trader signing")) {
    s += `
// idle-trader signing: uses the keystore Codemagic provides (or keystore.properties locally); unsigned debug builds still work without it
android {
    def ksPath = System.getenv("CM_KEYSTORE_PATH")
    if (ksPath != null) {
        signingConfigs { release { storeFile file(ksPath); storePassword System.getenv("CM_KEYSTORE_PASSWORD"); keyAlias System.getenv("CM_KEY_ALIAS"); keyPassword System.getenv("CM_KEY_PASSWORD") } }
        buildTypes { release { signingConfig signingConfigs.release } }
    }
    def bn = System.getenv("BUILD_NUMBER")
    if (bn != null) { defaultConfig { versionCode Integer.parseInt(bn) } }
}
`;
    fs.writeFileSync(gradle, s); console.log("build.gradle updated");
  }
}
