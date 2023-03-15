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

function onDeviceReady() {
  console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

  setupPushNotifications()
  setupAtomic()
}

function setupAtomic() {
  const ATOMIC_API_HOST = '';
  const ATOMIC_API_KEY = '';
  const ATOMIC_ENVIRONMENT_ID = '';
  const ATOMIC_STREAM_CONTAINER_ID = '';
  const ATOMIC_REQUEST_TOKEN_STRING = '';

  AtomicSDK.enableDebugMode(3)

  AtomicSDK.initialise(ATOMIC_API_HOST, ATOMIC_API_KEY, ATOMIC_ENVIRONMENT_ID)
  AtomicSDK.setSessionDelegate(() => {
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
    console.log('Registering for push notifications with token', data.registrationId);
    console.log('Device platform is ', device.platform)
    console.log(data.registrationType);
  });

  push.on('notification', (data) => {
    console.log('onNotification', data)
    console.log(data.title)
  });

  push.on('error', (e) => {
    console.log('error on push notification, probably simulator');
    console.log(e.message)
  });
}

