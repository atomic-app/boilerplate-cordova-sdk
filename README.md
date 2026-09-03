# Atomic Cordova boilerplate

A sample Cordova app that shows how to integrate the Atomic Web SDK in a WebView app, with native push notifications. The app bundles Atomic Web SDK 26.2.0 as two local scripts, `www/js/sdk.js` and `www/js/iframe-manager.js`.

The app does not run out of the box. You must supply your own configuration values from the Atomic Workbench.

## Prerequisites

- Node.js 20.17 or later
- Xcode with the iOS platform installed
- CocoaPods
- Cordova CLI: `npm install -g cordova`

CocoaPods requires a UTF-8 terminal. If `pod install` fails with a Unicode error during platform setup, run `export LANG=en_US.UTF-8` and try again.

## Run on iOS

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Open `www/js/index.js` and set the five constants in `setupAtomic()` with values from the Atomic Workbench. The last value is a JWT, signed per the [SDK authentication guide](https://documentation.atomic.io/sdks/auth-SDK). Pull `keys/atomic_private.pem` from 1Password into a `keys/` folder at the repo root, then run:

   ```bash
   npm run generate-token
   ```

   > The hardcoded JWT is a demo shortcut. In a real integration, the session delegate must return a fresh token each time the SDK requests one.

3. Set your own iOS bundle identifier, so Xcode can sign the app with your team:

   - In `config.xml`, change the `ios-CFBundleIdentifier` attribute to a value unique to your organization.
   - In `www/js/index.js`, set the same value as the iOS `appId` in `setNativeDeviceInfo()`. Push registration binds to this value, so the two must match.

4. Add the iOS platform. Use this exact version:

   ```bash
   cordova platform add ios@7.1.1
   ```

5. Open the Xcode workspace:

   ```bash
   open platforms/ios/HelloCordova.xcworkspace
   ```

6. To run on a physical device: in Xcode, select the HelloCordova target, open Signing & Capabilities, enable "Automatically manage signing", and select your team. Simulator runs do not need a team.

   > The Release section of Signing & Capabilities can show a signing error. Debug builds, which is what Run uses, are not affected.

7. Select a simulator or a connected device, then run (Cmd-R). Tap "Log in", then send a card to your test user from the Workbench. The card appears in the embedded view on the main screen, and the blue bell button opens the card list.

If you change any file in `www/` after step 4, run `cordova prepare ios` before you build again. Xcode builds the copy in `platforms/ios/www`, not `www/`.

## Push notifications

- Push notifications require a physical iOS device. The simulator does not receive them.
- The app must be in the background for a notification banner to appear.
- Your bundle identifier needs an APNs certificate or key configured as a notification platform in the Atomic Workbench. The setup steps in the [push notification guide for React Native](https://documentation.atomic.io/sdks/react-native/react-native-push-notifications) are almost identical for Cordova.

To test: run the app on a device, tap "Log in", send the app to the background, then send a card with a push notification from the Workbench.

## Debugging

- View JavaScript logs in Safari: Develop > your device > HelloAtomic. Startup errors occur before the inspector attaches, so run `location.reload()` in the console to see them.
- Native logs appear in the Xcode console when you run the app from Xcode.

## Android

The Android app requires a `google-services.json` file in the repo root before it builds. In the Firebase setup, use the `id` attribute of the `widget` element in `config.xml` as the application ID. Add the platform with `cordova platform add android`, then open `platforms/android` in Android Studio and run from there. Emulators on API 33 and above do not prompt for notification permission when started from the Cordova CLI.

## CI builds

Every push builds unsigned artifacts on CircleCI: an iOS Simulator build (zipped `.app`, no code signing) and an Android debug `.apk`. Both are attached to the job as artifacts — download them from the CircleCI job page.

- iOS: unzip `HelloCordova.app.zip` and install with `xcrun simctl install <device_id> HelloCordova.app`.
- Android: install with `adb install app-debug.apk`.

The Android job needs a `GOOGLE_SERVICES` project environment variable (the contents of `google-services.json`, base64-encoded) set in CircleCI project settings — same convention as `atomic-sdk-flutter` — it fails with a clear message until that's added.

Both jobs also need an `ATOMIC_PRIVATE_KEY` project environment variable (the contents of `keys/atomic_private.pem`, base64-encoded, from 1Password) set in CircleCI project settings. Each build generates a fresh JWT from it via `scripts/generate-token.js` and substitutes it into `www/js/index.js` — nothing token-shaped is ever committed to source or stored as a static secret, so there's nothing to expire or refresh.

Optionally, set an `ATOMIC_CUSTOMER_ID` project environment variable to control which Workbench test user the generated token authenticates as. It's a plain string (not base64), so CircleCI exposes it to the build automatically — no extra setup step needed. Without it, `scripts/generate-token.js` falls back to its hardcoded default test user.

These are debug/simulator builds only, not signed for a physical device or BrowserStack. Real-device signing (Apple distribution cert + provisioning profile, Android signing keystore) would need to be added the same way the other Atomic SDK sample-app pipelines do it, as a follow-up.
