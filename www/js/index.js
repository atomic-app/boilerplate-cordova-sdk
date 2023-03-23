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

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

let deviceToken
let hasReceivedJWT = false 
let hasRegisteredForNotifications = false

async function registerDeviceForNotificationsWhenReady() {
  if (deviceToken && hasReceivedJWT && !hasRegisteredForNotifications)  {
    console.log('Registering for notifications')
    try {
      await AtomicSDK.registerDeviceForNotifications(deviceToken);
      hasRegisteredForNotifications = true
    } catch (e) {
      console.error(e)
      return;
    }
  }
}

function onDeviceReady() {
  console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

  setupPushNotifications()
  setupAtomic()
}

function setupAtomic() {
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

  AtomicSDK.initialise(ATOMIC_API_HOST, ATOMIC_API_KEY, ATOMIC_ENVIRONMENT_ID)

  AtomicSDK.enableDebugMode(3)

  AtomicSDK.setNativeDeviceInfo({
    platform: device.platform,
    appId: device.platform == 'iOS' ? 'com.ios.atomic.boilerplate.cordova' : 'com.atomic.boilerplate.cordova',
    deviceId: device.uuid,
  });

  AtomicSDK.setSessionDelegate(() => {
    hasReceivedJWT = true
    registerDeviceForNotificationsWhenReady()
    return ATOMIC_REQUEST_TOKEN_STRING
  })

  AtomicSDK.singleCard(document.querySelector('#embed'), {
    streamContainerId: ATOMIC_STREAM_CONTAINER_ID,
    features: {
      cordova: {
        enabled: true
      }
    }
  })

  AtomicSDK.launch({
    streamContainerId: ATOMIC_STREAM_CONTAINER_ID,
    features: {
      cordova: {
        enabled: true
      }
    }
  })

  AtomicSDK.registerStreamContainersForNotificiations([ATOMIC_STREAM_CONTAINER_ID])
}

function setupPushNotifications() {
  const push = PushNotification.init({
    android: {
    },
    ios: {
      alert: "true",
      badge: "true",
      sound: "true"
    }
  });

  push.on('registration', (data) => {
    console.log('Device token is', data.registrationId);
    console.log('Device platform is ', device.platform)
    console.log('Device uuid is ', device.uuid)
    console.log(data.registrationType);
    deviceToken = data.registrationId
    registerDeviceForNotificationsWhenReady()
  });

  push.on('notification', (data) => {
    console.log('onNotification', data)

    const notificationData = AtomicSDK.notificationFromPushPayload(data.additionalData)
    console.log(`Notification data from atomic is: ${notificationData}`)

    const tracked = AtomicSDK.trackPushNotificationReceived(data.additionalData)
    console.log(`Push notification was tracked: ${tracked}`)
  });

  push.on('error', (e) => {
    console.log('error on push notification, probably simulator');
    console.log(e.message)
  });
}

