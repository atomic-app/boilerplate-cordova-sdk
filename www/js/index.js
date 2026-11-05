/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

const VARIANT_STORAGE_KEY = 'atomic-container-variant';
const DEFAULT_VARIANT = 'standalone';

// The stream container variants that can be selected from the Container picker. `mount` creates the
// variant's containers and returns them, so they can be stopped when the variant changes or the user
// logs out.
const VARIANTS = [
  {
    id: 'standalone',
    title: 'Standalone',
    mount: () => [mountStandalone('Standalone')],
  },
  {
    id: 'horizontal',
    title: 'Standalone (horizontal)',
    mount: () => [
      AtomicSDK.embed(
        document.querySelector('#horizontal-host'),
        containerConfig('Standalone (horizontal)', {
          horizontalContainerConfig: {enabled: true, cardWidth: 300},
        }),
        true
      ),
    ],
  },
  {
    id: 'launcher',
    title: 'Launcher',
    mount: () => [AtomicSDK.launch(containerConfig('Launcher'))],
  },
  {
    id: 'single-card',
    title: 'Single card',
    mount: () => [mountSingleCard('Single card')],
  },
  {
    id: 'modal',
    title: 'Modal stream',
    mount: () => [AtomicSDK.modalStreamContainer(containerConfig('Modal stream'))],
  },
  {
    id: 'multiple',
    title: 'Multiple containers',
    mount: () => [
      mountSingleCard('Single card'),
      mountStandalone('Standalone'),
      AtomicSDK.launch(containerConfig('Launcher')),
    ],
  },
];

let deviceToken;
let loggedIn = false;
let hasRegisteredForNotifications = false;

// Bumped on every login and logout, so an async callback can tell whether the session it
// started in is still current, and discard its result if not.
let sessionGeneration = 0;

let pendingLogout = null;

let selectedVariant = readStoredVariant();
let containerInstances = [];

function readStoredVariant() {
  try {
    const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
    if (VARIANTS.some((variant) => variant.id === stored)) {
      return stored;
    }
  } catch (e) {
    // Storage unavailable, use the default variant.
  }
  return DEFAULT_VARIANT;
}

function storeVariant(variantId) {
  try {
    localStorage.setItem(VARIANT_STORAGE_KEY, variantId);
  } catch (e) {
    // Storage unavailable, the selection is not remembered.
  }
}

// Callbacks that log to the console with the name of the container that called them, so that callbacks from
// containers sharing the page can be told apart.
function loggedCallbacks(label) {
  return {
    onSizeChanged: (width, height) => {
      console.log(`[${label}] onSizeChanged: ${width} x ${height}`);
    },
    onCardEvent: (event) => {
      console.log(`[${label}] onCardEvent: ${event.type}`);
    },
    onCardCountChanged: (count) => {
      console.log(`[${label}] onCardCountChanged: ${count}`);
    },
    onLauncherToggled: (isOpen) => {
      console.log(`[${label}] onLauncherToggled: ${isOpen}`);
    },
    onModalStreamToggled: (isOpen) => {
      console.log(`[${label}] onModalStreamToggled: ${isOpen}`);
    },
    onLinkButtonPressed: (payload) => {
      console.log(`[${label}] onLinkButtonPressed: ${JSON.stringify(payload)}`);
    },
    onSubmitButtonPressed: (payload) => {
      console.log(`[${label}] onSubmitButtonPressed: ${JSON.stringify(payload)}`);
    },
  };
}

function containerConfig(label, options = {}) {
  return {
    streamContainerId: ATOMIC_STREAM_CONTAINER_ID,
    features: {
      cordova: {
        enabled: true,
      },
    },
    ...loggedCallbacks(label),
    ...options,
  };
}

function mountStandalone(label) {
  return AtomicSDK.embed(
    document.querySelector('#standalone-host'),
    containerConfig(label)
  );
}

function mountSingleCard(label) {
  return AtomicSDK.singleCard(
    document.querySelector('#single-card-host'),
    containerConfig(label)
  );
}

function stopContainers() {
  containerInstances.forEach((container) => container.stop());
  containerInstances = [];
}

function mountContainers() {
  stopContainers();

  const variant = VARIANTS.find(({id}) => id === selectedVariant);
  console.log(`Mounting the "${variant.title}" container variant`);
  // `modalStreamContainer` returns nothing when a modal stream is already mounted.
  containerInstances = variant.mount().filter(Boolean);
}

function applyVariantLayout() {
  document.body.dataset.variant = selectedVariant;
}

function selectVariant(variantId) {
  selectedVariant = variantId;
  storeVariant(variantId);
  applyVariantLayout();

  if (loggedIn) {
    mountContainers();
  }
}

function populateVariantPicker() {
  const select = document.querySelector('#variantSelect');
  VARIANTS.forEach(({id, title}) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = title;
    select.appendChild(option);
  });
  select.value = selectedVariant;
}

function setSessionButtons(canLogIn, canLogOut) {
  document.querySelector('#loginBtn').disabled = !canLogIn;
  document.querySelector('#logoutBtn').disabled = !canLogOut;
}

// Mirrors the push status to the screen as well as the console, so the flow can be followed on a
// device without attaching a debugger.
function setPushStatus(message, state) {
  const status = document.querySelector('#pushStatus');
  status.textContent = message;
  status.classList.toggle('is-error', state === 'error');
  status.classList.toggle('is-success', state === 'success');

  if (state === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
}

// Registration needs both a push token from the device and a logged-in SDK session, and those arrive
// in either order, so this runs after each and does nothing until both are ready.
async function registerDeviceForNotificationsWhenReady() {
  if (!deviceToken || !loggedIn || hasRegisteredForNotifications) {
    return;
  }

  const generation = sessionGeneration;
  setPushStatus('Registering this device for notifications...');

  let registered;

  try {
    registered = await AtomicSDK.registerDeviceForNotifications(deviceToken);
  } catch (e) {
    if (generation !== sessionGeneration) {
      return;
    }
    setPushStatus(
      `Registering this device for notifications failed: ${e.message}`,
      'error'
    );
    return;
  }

  // The session ended while the request was in flight, so this result describes a session that
  // no longer exists. Leaving hasRegisteredForNotifications alone lets the next login register
  // the device again, rather than skipping it and leaving the device de-registered.
  if (generation !== sessionGeneration) {
    console.log('Discarded a registration that completed after the session ended');
    return;
  }

  hasRegisteredForNotifications = registered;
  setPushStatus('This device is registered for notifications.', 'success');
}

function setupAtomic() {
  AtomicSDK.initialise(ATOMIC_API_HOST, ATOMIC_API_KEY, ATOMIC_ENVIRONMENT_ID);

  AtomicSDK.enableDebugMode(3);

  AtomicSDK.onError = (error) => {
    console.error('[SDK] onError', error);
  };

  AtomicSDK.setNativeDeviceInfo({
    platform: device.platform,
    appId:
      device.platform == 'iOS'
        ? 'com.ios.atomic.boilerplate.cordova'
        : 'com.atomic.boilerplate.cordova',
    deviceId: device.uuid,
  });

  AtomicSDK.setSessionDelegate(() => {
    return ATOMIC_REQUEST_TOKEN_STRING;
  });

  mountContainers();

  AtomicSDK.registerStreamContainersForNotifications([
    ATOMIC_STREAM_CONTAINER_ID,
  ]).catch((e) => {
    console.error('Registering stream containers for notifications failed', e);
  });
}

function setupPushNotifications() {
  const push = PushNotification.init({
    android: {},
    ios: {
      alert: 'true',
      badge: 'true',
      sound: 'true',
      // Show the notification banner even while the app is in the foreground.
      forceShow: 'true',
    },
  });

  push.on('registration', (data) => {
    console.log('push.on registration');
    console.log('Device token is', data.registrationId);
    console.log('Device platform is ', device.platform);
    console.log('Device uuid is ', device.uuid);
    console.log(data.registrationType);
    deviceToken = data.registrationId;

    if (loggedIn) {
      registerDeviceForNotificationsWhenReady();
    } else {
      setPushStatus('Push token received. Log in to register this device.');
    }
  });

  push.on('notification', (data) => {
    console.log('onNotification: %j', data);

    const notificationData = AtomicSDK.notificationFromPushPayload(
      data.additionalData
    );
    console.log(`Notification data from atomic is: ${notificationData}`);

    const tracked = AtomicSDK.trackPushNotificationReceived(
      data.additionalData
    );
    console.log(`Push notification was tracked: ${tracked}`);
  });

  push.on('error', (e) => {
    console.log('error on push notification, probably simulator');
    console.log(e.message);
    setPushStatus(`No push token: ${e.message}`, 'error');
  });
}

async function login() {
  console.log('login clicked');
  setSessionButtons(false, false);

  // A logout still in flight finishes by clearing the SDK's containers, cached token and host
  // configuration, which would tear down the session being created here.
  if (pendingLogout) {
    setPushStatus('Finishing the previous logout...');
    try {
      await pendingLogout;
    } catch (e) {
      // logout() has already reported the failure.
    }
  }

  sessionGeneration++;
  setupAtomic();
  loggedIn = true;
  setSessionButtons(false, true);

  if (deviceToken) {
    registerDeviceForNotificationsWhenReady();
  } else {
    setPushStatus('Logged in. Waiting for a push token.');
  }
}

async function logout() {
  console.log('logout clicked');
  setSessionButtons(false, false);

  // Ends the session for any registration already in flight, so its result is discarded
  // instead of marking this device as registered after it has been de-registered.
  sessionGeneration++;
  loggedIn = false;
  hasRegisteredForNotifications = false;
  setPushStatus('Logging out and deregistering this device...');

  // Passing true deregisters this device for notifications as part of the logout.
  pendingLogout = AtomicSDK.logout(true);

  // Logging out empties the containers, removing them from the page is left to the app.
  stopContainers();

  try {
    await pendingLogout;
    setPushStatus('Logged out, and the device was deregistered for notifications.');
  } catch (e) {
    setPushStatus(`Logging out failed: ${e.message}`, 'error');
  } finally {
    pendingLogout = null;
    setSessionButtons(true, false);
  }
}

function registerObservers() {
  document.querySelector('#loginBtn').addEventListener('click', login);
  document.querySelector('#logoutBtn').addEventListener('click', logout);
  document
    .querySelector('#variantSelect')
    .addEventListener('change', (event) => selectVariant(event.target.value));
}

function onDeviceReady() {
  console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

  populateVariantPicker();
  applyVariantLayout();
  setupPushNotifications();
  registerObservers();
}

document.addEventListener('deviceready', onDeviceReady, false);
