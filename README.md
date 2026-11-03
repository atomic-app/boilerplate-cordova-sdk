# Atomic Cordova boilerplate

A sample Cordova app showing how to integrate the Atomic Web SDK in a WebView app, including
native push notifications.

The app bundles **Atomic Web SDK 26.3.0** as a single local script, `www/js/sdk.js`, downloaded
from <https://downloads.atomic.io/web-sdk/release/26.3.0/sdk.js>.

The app does not run out of the box. You must supply your own configuration values from the
Atomic Workbench.

## Stream container variants

The **Container** picker on the main screen switches between the ways a stream container can be
presented:

| Variant | SDK call |
| --- | --- |
| Standalone | `AtomicSDK.embed` |
| Standalone (horizontal) | `AtomicSDK.embed` with `horizontalContainerConfig` |
| Launcher | `AtomicSDK.launch` |
| Single card | `AtomicSDK.singleCard` |
| Modal stream | `AtomicSDK.modalStreamContainer` |
| Multiple containers | a single card, a standalone feed and a launcher together |

The choice is remembered between launches, and changing it while logged in remounts the
containers. Every container's callbacks are logged to the console prefixed with the container's
name, for example `[Standalone] onCardEvent: dismissed`, so callbacks from containers sharing a
page can be told apart.

The page also carries some host app content below the containers, to show that popovers,
subviews and the launcher panel render above it and that the page stays interactive underneath.

## Prerequisites

- Node.js 20.17 or later
- Cordova CLI 13: `npm install -g cordova`
- For iOS: Xcode with the iOS platform installed, and CocoaPods
- For Android: Android Studio (or the Android SDK command line tools) and JDK 17

CocoaPods requires a UTF-8 terminal. If `pod install` fails with a Unicode error during platform
setup, run `export LANG=en_US.UTF-8` and try again.

## Setup

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Open `www/js/index.js` and fill in the five `ATOMIC_` constants at the top of the file with
   values from the Atomic Workbench:

   ```javascript
   // Configuration -> SDK -> API Host (eg. "https://999-1.client-api.atomic.io")
   const ATOMIC_API_HOST = '';
   // Configuration -> SDK -> API keys (eg. "my-api-key")
   const ATOMIC_API_KEY = '';
   // Configuration -> Environment ID (eg. "AbC12de3")
   const ATOMIC_ENVIRONMENT_ID = '';
   // Configuration -> SDK -> Stream containers -> ID (eg. "123abcde")
   const ATOMIC_STREAM_CONTAINER_ID = '';
   // A JWT token generated following the SDK Authentication guide
   const ATOMIC_REQUEST_TOKEN_STRING = '';
   ```

   The last value is a JWT, signed per the
   [SDK authentication guide](https://documentation.atomic.io/sdks/auth-SDK). If you have the
   private key whose public key is registered in the Workbench, you can generate one and write it
   into `www/js/index.js` with:

   ```bash
   ATOMIC_PRIVATE_KEY_PATH=/path/to/private.pem \
   ATOMIC_CUSTOMER_ID=your-user-id \
   npm run generate-token
   ```

   > A hardcoded JWT is a demo shortcut. In a real integration the session delegate must return a
   > freshly minted token each time the SDK requests one.

3. Set your own iOS bundle identifier, so Xcode can sign the app with your team:

   - In `config.xml`, change the `ios-CFBundleIdentifier` attribute to a value unique to your
     organization.
   - In `www/js/index.js`, set the same value as the iOS `appId` in `setNativeDeviceInfo()`. Push
     registration binds to this value, so the two must match.

Cordova's default Content Security Policy may need adjusting for your own image or font hosts.
The policy in `www/index.html` already allows `*.atomic.io`, so it covers any Atomic-hosted API
host you configure in step 2. See the
[Web SDK documentation](https://documentation.atomic.io/sdks/web#content-security-policy).

## Run on iOS

1. Add the iOS platform:

   ```bash
   cordova platform add ios@8.1.1
   ```

   After each `cordova prepare ios`, an `after_prepare` hook
   (`scripts/fix-ios-pod-deployment-target.js`) raises every CocoaPods target to iOS 15.0.
   Firebase's Google dependencies still declare iOS 9.0 and 12.0 deployment targets, which current
   Xcode versions reject outright, and `cordova prepare` regenerates the Podfile each time.

2. Open the Xcode workspace:

   ```bash
   open platforms/ios/App.xcworkspace
   ```

3. To run on a physical device: select the App target, open Signing & Capabilities, enable
   "Automatically manage signing", and choose your team. Simulator runs do not need a team.

   > The Release section of Signing & Capabilities can show a signing error. Debug builds, which
   > is what Run uses, are not affected.

4. Select a simulator or a connected device and run (Cmd-R). Tap "Log in", then send a card to
   your test user from the Workbench.

Alternatively, build and run from the command line:

```bash
cordova build ios --emulator
cordova run ios
```

If you change any file in `www/` after step 1, run `cordova prepare ios` before building again.
Xcode builds the copy in `platforms/ios/www`, not `www/`.

## Run on Android

The Android app needs a `google-services.json` file in the repository root before it will build.
Create the app in the Firebase console using the `id` attribute of the `widget` element in
`config.xml` as the Android package name, then download the file to the root of this repository.

```bash
cordova platform add android
cordova build android --debug
cordova run android
```

You can also open `platforms/android` in Android Studio and run from there.

## Push notifications

- Push notifications work on the iOS Simulator, provided you are on macOS 13 or later on a Mac
  with Apple silicon or a T2 chip, running an iOS 16 or later simulator. The simulator registers
  with APNs and gets its own device token, tied to that simulator on that Mac. Only debug builds
  against the APNs **sandbox** environment work this way. Outside those conditions - an older Mac
  or simulator, or the production APNs environment - you need a physical device.
- You can also deliver a payload locally, without involving APNs, with
  `xcrun simctl push <device> com.ios.atomic.boilerplate.cordova payload.json`. That exercises the
  app's handling of a notification, but not registration or delivery.
- Your bundle identifier needs an APNs certificate or key configured as a notification platform in
  the Atomic Workbench. The setup steps in the
  [push notification guide for React Native](https://documentation.atomic.io/sdks/react-native/react-native-push-notifications)
  are almost identical for Cordova.

The app registers the device for notifications automatically, as soon as both a push token has
arrived from the operating system and you have logged in — the two can happen in either order.
The status line under the Log in / Logout buttons reports where that has got to, so the flow can
be followed on a device without attaching a debugger. Tapping "Logout" deregisters the device as
part of logging out.

Notification banners are shown even while the app is in the foreground.

To test: run the app on a device or a supported simulator, tap "Log in", then send a card with a
push notification from the Workbench.

## Updating the bundled SDK

`www/js/sdk.js` is a plain copy of a released Web SDK bundle. To move to a newer release, download
it over the top and update the version stated at the top of this file:

```bash
curl -o www/js/sdk.js https://downloads.atomic.io/web-sdk/release/<version>/sdk.js
```

## Debugging

- iOS JavaScript logs: Safari > Develop > your device > HelloAtomic. Startup errors happen before
  the inspector attaches, so run `location.reload()` in the console to see them.
- Android JavaScript logs: `chrome://inspect` in Chrome, or `adb logcat`.
- Native logs appear in the Xcode or Android Studio console when you run the app from there.
