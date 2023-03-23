# README.md

This is a boilerplate app to get you started with integrating the Atomic SDK in a Cordova app.

This app also integrates the native push notification functionality of the SDK to show how you can integrate support for native push notifications in your Cordova app.

The app will not run out of the box, you will need to provide your own configuration values. The Android app requires that you create a `google-services.json` file in the root directory before it will build.


## Prerequisites

Setup and install the Cordova CLI following the [documentation](https://cordova.apache.org/docs/en/11.x/guide/cli/index.html). 

```bash
npm install -g cordova
```

For iOS development follow the instructions for the [iOS platform](https://cordova.apache.org/docs/en/11.x/guide/platforms/ios/index.html). 

For Android follow the instructions for [Android platform](https://cordova.apache.org/docs/en/11.x/guide/platforms/android/index.html). 

## Setup

Open the `www/js/index.js` file in your editor.

In the `setupAtomic` function there are 5 constants where you will need to add your own values from the Atomic Workbench. The final value is a JWT token string, you can generate this following the [SDK authentication guide](https://documentation.atomic.io/sdks/auth-SDK). 

```javascript
// Configuration -> SDK -> API Host (eg. "https://999-1.client-api.atomic.io")
const ATOMIC_API_HOST = '';
// Configuration -> SDK -> API keys (eg. "my-api-key")
const ATOMIC_API_KEY = '';
// Configuration -> Environment ID (eg. "AbC12de3")
const ATOMIC_ENVIRONMENT_ID = '';
// Configuration -> SDK -> Stream containers -> ID (eg. "123abcde")
const ATOMIC_STREAM_CONTAINER_ID = '';
// A JWT token generated following the SDK Authentication guide (eg. "ey2askjhfakshjfakjhasjj...ashgfjahgjhagsjfhga")
const ATOMIC_REQUEST_TOKEN_STRING = '';
```

Due to Cordova's default CSP settings you will also need to modify the content policy in the `www/index.html` 

You will need to add to the `content` tag your API host eg. `https://999-1.client-api.atomic.io` as well as the same URL but with the protocol `wss://` instead of `https://` e.g. `wss://999-1.client-api.atomic.io`. The final Content-Security-Policy tag will look like this

```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' wss://999-1.client-api.atomic.io https://999-1.client-api.atomic.io blob: data: https://ssl.gstatic.com 'unsafe-eval'; style-src 'self' 'unsafe-inline'; media-src *; img-src 'self' data: content:;">
```

You will also need to change the bundle identifier on iOS.

Edit the bundle identifier in the `config.xml` file under the `ios-CFBundleIdentifier` attribute to one that will be unique to your organisation e.g. `ios-CFBundleIdentifier="com.ios.yourorg.boilerplate.cordova`. Update the appId in the call to `setNativeDeviceInfo` as well.

Install the dependencies using:

```bash
npm install
```

Run on an iOS simulator using:

```bash
cordova build ios
cordova run ios
```

Try sending a card to your user from the workbench. A single card should appear on the main screen, and if you press the blue "Bell" in the bottom right the SDK will open a list of cards. 

## Push Notification Specific Setup

To receive notifications on iOS you need to create a push certificate, and for Android you will need to set up the app in Firebase and get a legacy server key. 

You can follow our guide for the [React Native SDK](https://documentation.atomic.io/advanced/configure-push-notification-support-for-react-native) as the setup steps are almost identical.

Exceptions:
- For the iOS bundle identifier, use the value you choose earlier under the `ios-CFBundleIdentifier` attribute, for the Android appId use the `id` attribute in the `config.xml` file. 
- When using Cordova, the google-services.json file goes in the root directory, it will be automatically copied to the correct folder when the app is built.

You must run the app on a physical iOS device to receive notifications. They will not work in the simulator. 

## Debugging

### iOS

You can view the JavaScript console logs on iOS using the Safari Developer Tools, in Safari go to Develop -> YourDevice -> HelloAtomic.

To capture the errors when the page is first loaded enter `location.reload()` in the console.

You can also view error logs by running the app using Xcode, open up the `open platforms/ios/HelloCordova.xcworksapce` and run the app using Command-R. 

Look for errors in the console in the bottom left. 

### Android

You can view the JavaScript console logs for Android using the Chrome developer tools. In Chrome enter 'chrome://inspect' in the URL bar and then select your emulator or device in the list and choose 'Inspect'. 

You can view the native logs by opening the platforms/android directory in Android Studio. You can use the LogCat viewer to see the native logs and also run the app from there using Control-R. 




