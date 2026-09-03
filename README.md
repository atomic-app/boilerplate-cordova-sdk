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

Every push builds two artifacts on CircleCI, attached to their job as artifacts — download them from the CircleCI job page:

- **iOS device** (`build_ios_device_ipa`): development-signed `HelloCordova.ipa`, installable on registered test-device UDIDs. This is for testing only — it is not a TestFlight/App Store build.
- **Android** (`build_android_debug`): debug `.apk`. Install with `adb install app-debug.apk`. This job installs Gradle 7.1.1, switches to JDK 8, and installs Android build-tools 30.0.3 / platform android-30 before building — `cordova-android@10.1.2` is old enough that none of this matches what `cimg/android:2026.07` ships by default (Gradle 9/Groovy 4 can't resolve the `groovy.util.XmlParser` its build scripts use directly; the image's build-tools start at 35.0.0). All three versions come straight from this cordova-android release's own defaults (`GRADLE_VERSION`, `AGP_VERSION: 4.2.2`, `MIN_BUILD_TOOLS_VERSION`, `SDK_VERSION`), not arbitrary "older" choices.

A third, **iOS Simulator** (`build_ios_simulator`, unsigned zipped `.app`), is opt-in — it doesn't run on every push. Trigger it from CircleCI's "Trigger Pipeline" with the boolean parameter `build_for_simulator` set to `true`. Unzip and install with `xcrun simctl install <device_id> HelloCordova.app`.

Required CircleCI project environment variables:

| Variable | Job(s) | Contents |
|---|---|---|
| `GOOGLE_SERVICES` | Android | `google-services.json`, base64-encoded — same convention as `atomic-sdk-flutter` |
| `ATOMIC_PRIVATE_KEY` | all | `keys/atomic_private.pem`, base64-encoded, from 1Password |
| `ATOMIC_CUSTOMER_ID` | all (optional) | plain string; which Workbench test user the generated token authenticates as. Falls back to `scripts/generate-token.js`'s hardcoded default if unset |
| `IOS_CERTIFICATE` | iOS device | Apple **Development** certificate `.p12`, base64-encoded — the same kind of certificate Xcode's automatic signing uses locally, exported via Keychain Access |
| `IOS_CERTIFICATE_PASSWORD` | iOS device | export password set when creating the `.p12` |
| `IOS_PROVISIONING_PROFILE` | iOS device | a **Development** `.mobileprovision` for this app's bundle ID, base64-encoded — must have the test devices' UDIDs registered in the Apple Developer portal, and the Push Notifications capability enabled |

`ATOMIC_PRIVATE_KEY` and `ATOMIC_CUSTOMER_ID` are used the same way for all three builds: each generates a fresh JWT from the private key via `scripts/generate-token.js` and substitutes it into `www/js/index.js` — nothing token-shaped is ever committed to source or stored as a static secret, so there's nothing to expire or refresh.

The `build_ios_device_ipa` job builds with Fastlane (`fastlane/Fastfile`, `Gemfile`), same pattern as `action-cards-ios-sdk` and `atomic-sdk-flutter`: `setup_circle_ci` + `import_certificate` + `build_ios_app`, exported with `method: development`. There's no committed `Gemfile.lock` yet — the local Ruby available while setting this up was too old to generate one that would match CI's pinned Ruby (3.3.6, installed via `rbenv` in the job itself), so `bundle install` resolves fresh each run. Worth generating and committing one later for faster, more deterministic installs.
