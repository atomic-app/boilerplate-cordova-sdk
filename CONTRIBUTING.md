# Contributing

## CI builds

Every push builds two artifacts on CircleCI, attached to their job as artifacts — download them from the CircleCI job page:

- **iOS device** (`trigger_maestro_tests_ios`): development-signed `HelloCordova.ipa`, installable on registered test-device UDIDs. This is for testing only — it is not a TestFlight/App Store build.
- **Android** (`trigger_maestro_tests_android`): debug `.apk`. Install with `adb install app-debug.apk`. This job installs Gradle 8.13 and switches to JDK 17 before building, matching `cordova-android@14.0.1`'s own defaults (`GRADLE_VERSION`, `AGP_VERSION: 8.7.3`) — `cimg/android:2026.07`'s default Gradle 9.6.1 (Groovy 4) can't resolve `groovy.util.XmlParser`, which cordova-android's build scripts still use directly as of this release (fixed only in cordova-android 15.1.0). No `sdkmanager` install step is needed for build-tools/platform versions — the image's preinstalled build-tools (35.0.0+) and platforms (android-34+) already satisfy this release's `MIN_BUILD_TOOLS_VERSION: 35.0.0` / `SDK_VERSION: 35`.

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

The `trigger_maestro_tests_ios` job builds with Fastlane (`fastlane/Fastfile`, `Gemfile`), same pattern as `action-cards-ios-sdk` and `atomic-sdk-flutter`: `setup_circle_ci` + `import_certificate` + `build_ios_app`, exported with `method: development`. There's no committed `Gemfile.lock` yet — the local Ruby available while setting this up was too old to generate one that would match CI's pinned Ruby (3.3.6, installed via `rbenv` in the job itself), so `bundle install` resolves fresh each run. Worth generating and committing one later for faster, more deterministic installs.

### Triggering sdk-e2e-tests

Both build jobs end with a "Trigger maestro tests" step (`bin/trigger-maestro-tests.sh`, same pattern as `atomic-sdk-react-native`/`atomic-sdk-flutter`) that POSTs to `sdk-e2e-tests`'s CircleCI pipeline API with the freshly built artifact's URL. It only actually fires when either:

- the `trigger_maestro_tests_ios` / `trigger_maestro_tests_android` boolean pipeline parameters are passed as `true` via CircleCI's "Trigger Pipeline", or
- the branch is `push-26.2.0`.

Otherwise it's a no-op (logged, not skipped silently). An optional `source` string pipeline parameter (default `"CORDOVA"`) is passed through to the triggered pipeline as a label.

This needs `CIRCLE_API_TOKEN_BH` available as an env var in these jobs — sibling repos get it via a CircleCI context (e.g. `context: ios`) attached to the job. That's not wired up here yet; add a `context:` to `trigger_maestro_tests_ios`/`trigger_maestro_tests_android` once one is available for this project (referencing a context that doesn't exist yet breaks config validation for the whole pipeline, not just this step, so don't add it speculatively).

`sdk-e2e-tests` has a `maestro/cordova` suite and `cordova-ios`/`cordova-android` cases in `registry.yaml`/`run.sh`/`runTestsBrowserstackDevice.sh`/`scripts.sh`, but only on its own `qa-342-cordova-maestro-tests` branch so far (matching this repo's branch) — not yet merged to its main line. Until that lands there, triggering against any other branch there will fail with "Invalid SDK".
