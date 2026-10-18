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

const VARIANT_STORAGE_KEY = 'atomic-qa-container-variant';
const DEFAULT_VARIANT = 'standalone';

// The stream container variants that can be selected for testing. `mount` creates the variant's containers and
// returns them, so they can be stopped when the variant changes or the user logs out.
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

async function registerDeviceForNotificationsWhenReady() {
  if (deviceToken && loggedIn && !hasRegisteredForNotifications) {
    console.log('Registering for notifications');
    try {
      let registered = await AtomicSDK.registerDeviceForNotifications(
        deviceToken
      );
      hasRegisteredForNotifications = registered;
      console.log('Registered for notifications', registered);
    } catch (e) {
      console.error(e);
      return;
    }
  }
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
    registerDeviceForNotificationsWhenReady();
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
  });
}

function login() {
  console.log('login clicked');
  setupAtomic();
  document.querySelector('#loginBtn').disabled = true;
  document.querySelector('#logoutBtn').disabled = false;
  loggedIn = true;
  registerDeviceForNotificationsWhenReady();
}

function logout() {
  console.log('logout clicked');
  AtomicSDK.logout();

  document.querySelector('#loginBtn').disabled = false;
  document.querySelector('#logoutBtn').disabled = true;

  loggedIn = false;
  hasRegisteredForNotifications = false;

  // Logging out empties the containers, removing them from the page is left to the app.
  stopContainers();
}

function registerObservers() {
  document.querySelector('#loginBtn').addEventListener('click', login);
  document.querySelector('#logoutBtn').addEventListener('click', logout);
  document
    .querySelector('#variantSelect')
    .addEventListener('change', (event) => selectVariant(event.target.value));
  document.querySelector('#hostPageButton').addEventListener('click', () => {
    console.log('Host page button pressed');
  });
}

function onDeviceReady() {
  console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

  populateVariantPicker();
  applyVariantLayout();
  setupPushNotifications();
  registerObservers();
}

document.addEventListener('deviceready', onDeviceReady, false);
