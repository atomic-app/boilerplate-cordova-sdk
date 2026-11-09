# Contributing

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | The customer-facing boilerplate. No Fastlane, no internal credentials, no QA rigs, and no CI beyond the one sync workflow described below. Only ships APIs that are in a public Web SDK release. |
| `qa` | This branch. Internal SDK testing: CI, Fastlane, the maestro trigger, QA rigs for unreleased SDK features, and internal token defaults. |

`qa` branches off `main`. When `main` moves, rebase or merge it into `qa` rather than the
other way round — nothing on `qa` should reach `main` without being reviewed for whether a
customer should see it.

### Keeping `qa` current with `main`

Testing on `qa` is only meaningful if it reflects what customers actually get from `main`, so
`main` is merged into `qa` as it moves, not in a batch before a release.

`.github/workflows/sync-main-to-qa.yml` does the opening part of that automatically. On every
push to `main` it checks whether `qa` already contains `main` and, if not, opens a pull request
merging `main` into `qa`. An already-open sync PR is left alone: GitHub keeps it current as more
commits land on `main`, so there is only ever one.

That workflow is the one exception to `main` carrying no CI. It has to live there: a
push-triggered workflow runs the copy of itself that exists in the branch that was pushed, so a
copy on `qa` alone would never fire for a push to `main`. Scheduled and manually dispatched
workflows are no way around it - both run from the default branch, which is also `main`. Keep it
the only workflow on `main`, and keep it self-explanatory: this is a public repository, so anyone
cloning the boilerplate gets it along with everything else. It is inert for them - it looks for a
`qa` branch, finds none in their fork, and stops.

**The workflow never merges.** It only opens the PR, for three reasons worth keeping in mind
when resolving one:

- The two branches diverge across most of the shared files - `README.md`, `www/js/index.js`,
  `config.xml` and `package.json` among them - so a sync PR conflicts routinely. That is expected,
  not a sign anything is wrong. Resolve conflicts on `qa`, keeping the QA rigs and internal
  defaults, and take `main`'s version of anything customer-facing.
- A change on `main` can need a matching change to a QA rig before it is testable - a new SDK
  option usually wants a control in the header, for example - and that work belongs in the sync
  PR.
- Merging is the point at which someone confirms `qa` still builds and still tests what it is
  meant to, which CI alone does not establish.

If the workflow is ever unavailable, the same thing by hand:

## Choosing the SDK bundle

`www/js/sdk.js` is a committed copy of a Web SDK bundle. Replace it with any other build using:

```bash
npm run fetch-sdk                          # the default release
npm run fetch-sdk -- <url>                 # a release candidate or feature-branch build
ATOMIC_SDK_URL=<url> npm run fetch-sdk     # same, from the environment
```

CI takes the same URL as the `sdk_url` string pipeline parameter. Leave it empty to build
against the bundle committed here.

## CI builds

Pushes build up to two artifacts on CircleCI, attached to their job — download them from the
CircleCI job page. Each job runs only when its boolean pipeline parameter is `true`; iOS defaults
to `true` and Android to `false`, and either can be overridden from "Trigger Pipeline":

- **iOS device** (`trigger_maestro_tests_ios`): development-signed `HelloCordova.ipa`,
  installable on registered test-device UDIDs. Testing only — not a TestFlight/App Store build.
- **Android** (`trigger_maestro_tests_android`): debug `.apk`. Install with
  `adb install app-debug.apk`.

A third, **iOS Simulator** (`build_ios_simulator`, unsigned zipped `.app`), is opt-in — it does
not run on every push. Trigger it from CircleCI's "Trigger Pipeline" with the boolean parameter
`build_for_simulator` set to `true`. Unzip and install with
`xcrun simctl install <device_id> HelloCordova.app`.

Note that cordova-ios 8 names the generated Xcode project, workspace, scheme and target `App`
(cordova-ios 7 named them all `HelloCordova`). The built product is still `HelloCordova.app` /
`HelloCordova.ipa`, which is what the maestro trigger expects.

cordova-android 15.1.0 needs no Gradle or build-tools install step: cordova drives the build
through the Gradle wrapper it generates (8.14.2), and `cimg/android`'s preinstalled build-tools
and platforms already satisfy this release's `MIN_BUILD_TOOLS_VERSION: 36.0.0` / `SDK_VERSION: 36`.
The job does select JDK 17 explicitly, matching AGP 8.10.1's documented minimum. cordova-android
14 additionally needed Gradle pinned to 8.13, because its build scripts used
`groovy.util.XmlParser` directly and the image's Groovy 4 Gradle could not resolve it; that was
fixed in 15.1.0 and the workaround has been removed.

Required CircleCI project environment variables:

| Variable | Job(s) | Contents |
|---|---|---|
| `GOOGLE_SERVICES` | Android | `google-services.json`, base64-encoded — same convention as `atomic-sdk-flutter` |
| `ATOMIC_PRIVATE_KEY` | all | `keys/atomic_private.pem`, base64-encoded, from 1Password |
| `ATOMIC_CUSTOMER_ID` | all (optional) | plain string; which Workbench test user the generated token authenticates as. Falls back to `scripts/generate-token.js`'s default if unset |
| `IOS_CERTIFICATE` | iOS device | Apple **Development** certificate `.p12`, base64-encoded — the same kind Xcode's automatic signing uses locally, exported via Keychain Access |
| `IOS_CERTIFICATE_PASSWORD` | iOS device | export password set when creating the `.p12` |
| `IOS_PROVISIONING_PROFILE` | iOS device | a **Development** `.mobileprovision` for this app's bundle ID, base64-encoded — must have the test devices' UDIDs registered in the Apple Developer portal, and the Push Notifications capability enabled |

`ATOMIC_PRIVATE_KEY` and `ATOMIC_CUSTOMER_ID` are used the same way for all three builds: each
generates a fresh JWT from the private key via `scripts/generate-token.js`, which writes it to
`www/js/token.js`. That file is gitignored — nothing token-shaped is ever committed to source or
stored as a static secret, so there is nothing to expire or refresh.

The `trigger_maestro_tests_ios` job builds with Fastlane (`fastlane/Fastfile`, `Gemfile`), same
pattern as `action-cards-ios-sdk` and `atomic-sdk-flutter`: `setup_circle_ci` +
`import_certificate` + `build_ios_app`, exported with `method: development`. There is no committed
`Gemfile.lock` yet — the local Ruby available while setting this up was too old to generate one
matching CI's pinned Ruby (3.3.13, installed via `rbenv` in the job itself), so `bundle install`
resolves fresh each run. Worth generating and committing one later for faster, more deterministic
installs.

### Triggering sdk-e2e-tests

Both build jobs end with a "Trigger maestro tests" step (`bin/trigger-cordova-tests.sh`, same
pattern as `atomic-sdk-react-native`/`atomic-sdk-flutter`) that POSTs to `sdk-e2e-tests`'s
CircleCI pipeline API with the freshly built artifact's URL. It runs whenever its job does, so the
`trigger_maestro_tests_ios` / `trigger_maestro_tests_android` parameters above control both the
build and the trigger. An optional `source` string pipeline
parameter (default `"CORDOVA"`) is passed through to the triggered pipeline as a label.

This needs `CIRCLE_API_TOKEN_BH` available as an env var in these jobs — sibling repos get it via
a CircleCI context (e.g. `context: ios`) attached to the job. That is not wired up here yet; add a
`context:` to `trigger_maestro_tests_ios`/`trigger_maestro_tests_android` once one is available for
this project (referencing a context that does not exist yet breaks config validation for the whole
pipeline, not just this step, so do not add it speculatively).

`sdk-e2e-tests` has a `maestro/cordova` suite and `cordova-ios`/`cordova-android` cases in
`registry.yaml`/`run.sh`/`runTestsBrowserstackDevice.sh`/`scripts.sh`, but only on its own
`qa-342-cordova-maestro-tests` branch so far — not yet merged to its main line. Until that lands,
triggering against any other branch there will fail with "Invalid SDK".
