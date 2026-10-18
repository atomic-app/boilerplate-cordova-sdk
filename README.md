# Atomic Cordova boilerplate

A sample Cordova app that shows how to integrate the Atomic Web SDK in a WebView app, with native push notifications. The app bundles Atomic Web SDK 26.3.0 as a single local script, `www/js/sdk.js`.

This branch is set up for QA regression testing of the Web SDK 26.3.0 release. Choose a stream container variant from the **Container** picker on the main screen: Standalone (the default), Standalone (horizontal), Launcher, Single card, Modal stream, or Multiple containers (a single card, a standalone feed and a launcher together). The choice is remembered, and changing it while logged in remounts the containers. Each container's callbacks are logged to the console with the container's name, for example `[Standalone] onCardEvent: dismissed`.

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

2. Open `www/js/index.js` and set the five `ATOMIC_` constants at the top of the file with values from the Atomic Workbench. The last value is a JWT, signed per the [SDK authentication guide](https://documentation.atomic.io/sdks/auth-SDK). Pull `keys/atomic_private.pem` from 1Password into a `keys/` folder at the repo root, then run:

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

   After each `cordova prepare ios`, an `after_prepare` hook (`scripts/fix-ios-deployment-target.js`) raises the iOS deployment target of CordovaLib and every pod to 15.0, re-running `pod install` when the Podfile changes, because current Xcode versions reject their own lower targets.

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
sd