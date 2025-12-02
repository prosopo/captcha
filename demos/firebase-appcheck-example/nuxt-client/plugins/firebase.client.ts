// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  // Initialize Firebase
  const firebaseApp = initializeApp({
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  });

  // Initialize App Check with custom provider
  // The actual token fetching will be handled by the ProcaptchaAppCheck component
  const appCheck = initializeAppCheck(firebaseApp, {
    provider: new CustomProvider({
      getToken: async () => {
        // Check if we have a valid cached token
        const cachedToken = sessionStorage.getItem('appCheckToken');
        const tokenExpiry = sessionStorage.getItem('appCheckTokenExpiry');
        
        if (cachedToken && tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry, 10);
          if (Date.now() < expiryTime) {
            return {
              token: cachedToken,
              expireTimeMillis: expiryTime,
            };
          }
        }

        // If no valid cached token, return empty
        // The user will need to complete Procaptcha again
        return {
          token: '',
          expireTimeMillis: 0,
        };
      },
    }),
    isTokenAutoRefreshEnabled: false, // We'll handle refresh via Procaptcha
  });

  return {
    provide: {
      firebase: firebaseApp,
      appCheck,
    },
  };
});
