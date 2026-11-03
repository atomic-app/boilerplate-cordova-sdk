# Atomic Cordova boilerplate

A sample Cordova app showing how to integrate the Atomic Web SDK in a WebView app, including
native push notifications.

The app bundles **Atomic Web SDK 26.3.0** as a single local script, `www/js/sdk.js`, downloaded
from <https://downloads.atomic.io/web-sdk/release/26.3.0/sdk.js>.

> **This is the internal `qa` branch.** It carries CI, Fastlane, the maestro trigger and test
> rigs for SDK features that are not in a public release yet, and it may be pointed at a
> non-release SDK bundle. The customer-facing boilerplate is `main`. See
> [CONTRIBUTING.md](CONTRIBUTING.md).

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

   Internally, pull `keys/atomic_private.pem` from 1Password into a `keys/` folder at the
   repository root and run `npm run generate-token` with no environment variables — the script
   defaults to that path and to a demo test user.

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

Registration is **not** automatic on this branch. The device registers only when you tap
"Register device", so each call is deliberate and can be repeated with a different APNs mode. The
status line under the buttons reports the outcome of the last call, so push can be tested on a
device without attaching the Safari inspector; full detail is still logged to the console.

Notification banners are shown even while the app is in the foreground.

To test: run the app on a device or a supported simulator, tap "Log in", then send a card with a
push notification from the Workbench.

## Testing the APNs environment (apnsMode)

> `apnsMode` is not in Web SDK 26.3.0. It ships in 26.3.1. To test it, point this branch at a
> bundle that has it with `npm run fetch-sdk -- <url>`.

`registerDeviceForNotifications` and `deregisterDeviceForNotifications` take an optional
`apnsMode`, telling the Atomic Platform whether the device token belongs to the APNs `sandbox` or
`prod` environment, or to `both`. It exists because a single `appId` can be configured as two
notification platforms in the Workbench - one sandbox, one production - and without the mode the
platform cannot tell which of the two a registration is for, so the request fails.

The header has three controls for this, below the Log in / Logout buttons:

- **APNs mode** - the value sent with the next call. "Not set (omit apnsMode)" sends no `apnsMode`
  at all, which is exactly how an app written before this option behaves. The choice is remembered
  between launches.
- **Register device** - calls `registerDeviceForNotifications` with the selected mode. Enabled once
  you are logged in and a push token has arrived.
- **Deregister device** - calls `deregisterDeviceForNotifications` with the selected mode. Enabled
  once you are logged in.

Tapping **Logout** calls `AtomicSDK.logout(true)`, which deregisters the device as part of the
logout. The SDK always does that with `apnsMode: "both"`, regardless of the picker.

### Workbench setup

The interesting case needs **one `appId` configured as both a sandbox and a production
notification platform** in your environment. Set your own environment up that way, and make sure
the iOS `appId` in `setNativeDeviceInfo()` in `www/js/index.js` matches the
`ios-CFBundleIdentifier` in `config.xml`.

### What to check

With one `appId` on both sandbox and production configurations:

| Action | Expected |
| --- | --- |
| Register with **Not set** | Fails: the platform cannot choose between the two configurations. This is the bug `apnsMode` fixes, and it is what an app on an older SDK does. |
| Register with **sandbox** / **prod** | Succeeds, registering against that environment only. |
| Register with **both** | Succeeds, registering against both environments. |
| Push delivery | A card sent from the Workbench reaches a device registered under the matching environment. A debug build run from Xcode uses the APNs sandbox. |
| Deregister with **sandbox** / **prod** / **both** | Succeeds. See the limitation below before judging the result. |

With a single notification configuration for the `appId`, every mode should succeed, including
**Not set** - the option must not break the common setup.

### Known limitation on deregistration

At the time of writing, the client API **ignores `apnsMode` on de-registration for Web SDK
callers** and removes every registration for the device and app, whichever mode you pick. The
request still returns success. This is a platform-side issue, not an SDK one, and is tracked
separately; the SDK sends the value correctly, which you can confirm in the request body in the
console with debug logging on. Until it is fixed, a selective de-register cannot be verified end
to end - check the request payload rather than the resulting registrations.

## Choosing the SDK bundle

`www/js/sdk.js` is a committed copy of a Web SDK bundle. Replace it with any other build - a
release, a release candidate, or a build of an SDK feature branch - with:

```bash
npm run fetch-sdk                          # the default release
npm run fetch-sdk -- <url>                 # an explicit bundle URL
ATOMIC_SDK_URL=<url> npm run fetch-sdk     # same, from the environment
```

The script checks the downloaded file carries an Atomic Web SDK banner and prints the version it
wrote, so the build log records exactly which bundle went in. CI takes the same URL as the
`sdk_url` pipeline parameter.

## Debugging

- iOS JavaScript logs: Safari > Develop > your device > HelloAtomic. Startup errors happen before
  the inspector attaches, so run `location.reload()` in the console to see them.
- Android JavaScript logs: `chrome://inspect` in Chrome, or `adb logcat`.
- Native logs appear in the Xcode or Android Studio console when you run the app from there.
