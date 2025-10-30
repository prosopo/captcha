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

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Example protected Cloud Function that requires App Check verification
 * 
 * This function can only be called by clients that have a valid App Check token,
 * which in our case is obtained by completing the Procaptcha challenge.
 */
export const myProtectedFunction = functions.https.onCall(async (data, context) => {
  // Verify App Check token
  if (context.app === undefined) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'The function must be called from an App Check verified app.'
    );
  }

  // Log the request for debugging
  console.log('Protected function called with data:', data);
  console.log('App Check verified, app ID:', context.app.appId);

  // Your protected business logic here
  // Example: database operations, sensitive calculations, etc.
  const result = {
    message: 'Success! This function is protected by App Check with Procaptcha.',
    timestamp: new Date().toISOString(),
    receivedData: data,
    appId: context.app.appId,
  };

  return result;
});

/**
 * Example HTTP function with App Check verification
 * 
 * For HTTP functions, you need to manually verify the App Check token
 */
export const myProtectedHttpFunction = functions.https.onRequest(async (req, res) => {
  // CORS headers (adjust for production)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Firebase-AppCheck');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Get the App Check token from the request header
    const appCheckToken = req.header('X-Firebase-AppCheck');

    if (!appCheckToken) {
      res.status(401).json({ error: 'Missing App Check token' });
      return;
    }

    // Verify the App Check token
    const appCheckClaims = await admin.appCheck().verifyToken(appCheckToken);

    // Token is valid, proceed with the request
    console.log('App Check verified for app:', appCheckClaims.app_id);

    res.status(200).json({
      message: 'Success! HTTP function protected by App Check with Procaptcha.',
      timestamp: new Date().toISOString(),
      appId: appCheckClaims.app_id,
    });
  } catch (error) {
    console.error('App Check verification failed:', error);
    res.status(401).json({ 
      error: 'App Check verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Example of a public function (no App Check required)
 * This is for comparison purposes
 */
export const publicFunction = functions.https.onCall(async (data, context) => {
  return {
    message: 'This is a public function. No App Check verification required.',
    timestamp: new Date().toISOString(),
  };
});
