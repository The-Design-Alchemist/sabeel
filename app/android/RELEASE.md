# Android release build (signed AAB for the Play Store)

Release signing is wired up in `app/build.gradle`. It reads the keystore + passwords from
`android/keystore.properties`, which is **gitignored** — the signing key and passwords are
never committed. When that file is absent (fresh clone / CI), release builds fall back to
debug signing so the build still succeeds.

> ⚠️ The repo currently has a **throwaway TEST key** (`sabeel-upload-TEST.jks` +
> `keystore.properties`, both gitignored, present only on this machine) used to verify the
> pipeline. **Replace it with your own upload key before publishing** — see below.

## 1. Generate your upload key (do this once, keep it forever)
```bash
"/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
  -genkeypair -v \
  -keystore ~/Downloads/sabeel/app/android/sabeel-upload.jks \
  -alias sabeel -keyalg RSA -keysize 2048 -validity 10000
```
It will prompt for a keystore password, key password, and your name/org.

> 🔑 **Back up `sabeel-upload.jks` and its passwords somewhere safe (password manager).**
> If you lose them you can never ship an update to this app again. (With Play App Signing —
> recommended, enabled at first upload — Google holds the real app-signing key and you can
> reset a lost *upload* key, but don't rely on it: keep your key.)

## 2. Point `keystore.properties` at it
Edit `android/keystore.properties` (gitignored):
```properties
storeFile=sabeel-upload.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=sabeel
keyPassword=YOUR_KEY_PASSWORD
```
`storeFile` is resolved relative to `android/`.

## 3. Build the AAB
```bash
cd ~/Downloads/sabeel/app
npm run build && npx cap sync android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  android/gradlew -p android :app:bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab` → upload to the Play Console.
(For a local device install use `:app:assembleRelease` → `app-release.apk`; you must uninstall a
debug build first, since the signing key differs.)

## 4. Before each release
- Bump `versionCode` (integer, must increase every upload) and `versionName` in `app/build.gradle`.
- At the **first** upload, enable **Play App Signing** in the Play Console.

## Notes
- **R8/minify is currently OFF** (`minifyEnabled false`) to avoid stripping Capacitor plugin
  classes loaded via reflection. To enable it later: set `minifyEnabled true` (+ optionally
  `shrinkResources true`), add keep rules for `com.getcapacitor.Plugin` subclasses to
  `app/proguard-rules.pro`, then rebuild and **re-test on device** (streaming, download,
  offline, media session) before shipping.
- Verify a built APK's signature: `apksigner verify --print-certs <apk>` (needs `JAVA_HOME` set).
