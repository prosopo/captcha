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

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // Prosopo
      prosopoSiteKey: process.env.PROSOPO_SITE_KEY || '',
      
      // Firebase
      firebaseApiKey: process.env.FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.FIREBASE_APP_ID || '',
      
      // Custom Provider
      customProviderUrl: process.env.CUSTOM_PROVIDER_URL || 'http://localhost:3001',
    },
  },
  
  modules: [],
  
  devtools: { enabled: true },
  
  // SSR should be disabled for this example as Firebase SDK is client-side only
  ssr: false,
});
