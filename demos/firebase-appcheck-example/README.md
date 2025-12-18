# Firebase App Check Integration with Prosopo Procaptcha

This guide demonstrates how to integrate Prosopo Procaptcha as a Custom Provider for Firebase App Check in a Nuxt 3 application.

## Overview

Firebase App Check helps protect your backend resources from abuse by working with both App Attest (for Apple platforms), Play Integrity (for Android), and reCAPTCHA Enterprise (for web). This example shows how to use Procaptcha as a custom provider, giving you privacy-focused bot protection that's GDPR compliant.

## Architecture

The integration involves three main components:

1. **Client Side (Nuxt 3)**: Obtains Procaptcha tokens and exchanges them for Firebase App Check tokens
2. **Custom Provider Backend**: Validates Procaptcha tokens and issues Firebase App Check tokens
3. **Firebase Backend**: Validates App Check tokens before serving requests

## Prerequisites

- A [Prosopo account](https://prosopo.io/register) with a Site Key and Secret Key
- A Firebase project with App Check enabled
- Node.js 18+ installed
- Basic knowledge of Nuxt 3 and Firebase

## Step 1: Set Up the Custom Provider Backend

The custom provider backend validates Procaptcha tokens and issues Firebase App Check tokens.

### Install Dependencies

```bash
npm install express @prosopo/server @prosopo/types @prosopo/common @prosopo/keyring dotenv
npm install --save-dev @types/express typescript ts-node
```

### Create the Custom Provider Server

Create `server/custom-provider.ts`:

```typescript
import express, { Request, Response } from 'express';
import { ProsopoServer } from '@prosopo/server';
import { getPair } from '@prosopo/keyring';
import { ApiParams, type ProcaptchaToken, type ProsopoServerConfigOutput } from '@prosopo/types';
import { ProsopoEnvError } from '@prosopo/common';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const app = express();
app.use(express.json());

// Prosopo configuration
const prosopoConfig: ProsopoServerConfigOutput = {
  account: {
    secret: process.env.PROSOPO_SITE_PRIVATE_KEY!,
  },
  serverUrl: process.env.PROSOPO_SERVER_URL || 'https://api.prosopo.io',
  siteKey: process.env.PROSOPO_SITE_KEY!,
  networks: {
    development: {
      endpoint: process.env.PROSOPO_SERVER_URL || 'https://api.prosopo.io',
      contract: {
        address: process.env.PROSOPO_CONTRACT_ADDRESS || '',
        name: 'prosopo',
      },
    },
  },
  defaultEnvironment: 'development',
};

/**
 * Verify Procaptcha token and issue Firebase App Check token
 */
app.post('/verify-captcha', async (req: Request, res: Response) => {
  try {
    const { token, ip } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify Procaptcha token
    const pair = await getPair(prosopoConfig.account.secret);
    const prosopoServer = new ProsopoServer(prosopoConfig, pair);
    
    const verified = await prosopoServer.isVerified(token as ProcaptchaToken);

    if (!verified) {
      return res.status(401).json({ 
        error: 'Captcha verification failed',
        verified: false 
      });
    }

    // Generate Firebase App Check token
    // TTL: 1 hour (adjust as needed)
    const appCheckToken = await admin.appCheck().createToken(
      process.env.FIREBASE_APP_ID!,
      {
        ttlMillis: 3600000, // 1 hour
      }
    );

    return res.status(200).json({
      verified: true,
      appCheckToken: appCheckToken.token,
      ttl: appCheckToken.ttlMillis,
    });

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Custom provider server running on port ${PORT}`);
});
```

### Environment Variables

Create `.env` file:

```env
# Prosopo Configuration
PROSOPO_SITE_KEY=your_prosopo_site_key
PROSOPO_SITE_PRIVATE_KEY=your_prosopo_secret_key
PROSOPO_SERVER_URL=https://api.prosopo.io

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_APP_ID=your-firebase-app-id

# Server Configuration
PORT=3001
```

### Start the Custom Provider Server

```bash
npx ts-node server/custom-provider.ts
```

## Step 2: Set Up Firebase App Check in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **App Check** in the left sidebar
4. Click **Apps** tab and register your web app if not already done
5. Under **Custom Provider**, add your custom provider backend URL
6. Note down the App Check debug token for development (optional)

## Step 3: Integrate Procaptcha in Nuxt 3 Client

### Install Dependencies

```bash
npm install @prosopo/procaptcha-vue firebase
```

### Configure Firebase

Create `plugins/firebase.client.ts`:

```typescript
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
  const appCheck = initializeAppCheck(firebaseApp, {
    provider: new CustomProvider({
      getToken: async () => {
        // This will be implemented in the component
        return {
          token: '',
          expireTimeMillis: 0,
        };
      },
    }),
    isTokenAutoRefreshEnabled: true,
  });

  return {
    provide: {
      firebase: firebaseApp,
      appCheck,
    },
  };
});
```

### Create Procaptcha Component

Create `components/ProcaptchaAppCheck.vue`:

```vue
<template>
  <div class="procaptcha-container">
    <Procaptcha
      :config="procaptchaConfig"
      @verify="handleVerify"
      @error="handleError"
      @expired="handleExpired"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Procaptcha } from '@prosopo/procaptcha-vue';
import type { ProcaptchaOutput, ProcaptchaClientConfigOutput } from '@prosopo/types';

const config = useRuntimeConfig();
const customProviderUrl = config.public.customProviderUrl;

// Procaptcha configuration
const procaptchaConfig = computed<ProcaptchaClientConfigOutput>(() => ({
  account: {
    address: config.public.prosopoSiteKey,
  },
  siteKey: config.public.prosopoSiteKey,
  theme: 'light',
  callbackName: 'onProcaptchaVerify',
}));

// Custom provider token exchange function
const exchangeTokenForAppCheck = async (procaptchaToken: string) => {
  try {
    const response = await fetch(`${customProviderUrl}/verify-captcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: procaptchaToken,
        ip: '', // Optional: can be added if needed
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error exchanging token:', error);
    throw error;
  }
};

// Event handlers
const emit = defineEmits<{
  (e: 'verified', token: string): void;
  (e: 'error', error: Error): void;
}>();

const handleVerify = async (output: ProcaptchaOutput) => {
  try {
    console.log('Procaptcha verified:', output);
    
    // Exchange Procaptcha token for Firebase App Check token
    const result = await exchangeTokenForAppCheck(output.token);
    
    if (result.verified && result.appCheckToken) {
      // Store the App Check token for use in Firebase requests
      sessionStorage.setItem('appCheckToken', result.appCheckToken);
      sessionStorage.setItem('appCheckTokenExpiry', Date.now() + result.ttl);
      
      emit('verified', result.appCheckToken);
    } else {
      throw new Error('Token exchange failed');
    }
  } catch (error) {
    console.error('Verification error:', error);
    emit('error', error as Error);
  }
};

const handleError = (error: Error) => {
  console.error('Procaptcha error:', error);
  emit('error', error);
};

const handleExpired = () => {
  console.log('Procaptcha expired');
  // Clear stored tokens
  sessionStorage.removeItem('appCheckToken');
  sessionStorage.removeItem('appCheckTokenExpiry');
};
</script>

<style scoped>
.procaptcha-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
</style>
```

### Use in Your Page

Create `pages/index.vue`:

```vue
<template>
  <div class="container">
    <h1>Firebase App Check with Procaptcha</h1>
    
    <div v-if="!isVerified" class="verification-section">
      <p>Please complete the verification to access protected resources:</p>
      <ProcaptchaAppCheck 
        @verified="handleVerified"
        @error="handleError"
      />
    </div>

    <div v-else class="protected-content">
      <h2>✓ Verified!</h2>
      <p>You can now access protected Firebase resources.</p>
      <button @click="callProtectedFunction">
        Call Protected Cloud Function
      </button>
      
      <div v-if="functionResult" class="result">
        <h3>Result:</h3>
        <pre>{{ functionResult }}</pre>
      </div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getFunctions, httpsCallable } from 'firebase/functions';

const isVerified = ref(false);
const error = ref<string | null>(null);
const functionResult = ref<any>(null);

const { $firebase } = useNuxtApp();

const handleVerified = (token: string) => {
  isVerified.value = true;
  error.value = null;
  console.log('App Check token received');
};

const handleError = (err: Error) => {
  error.value = err.message;
  isVerified.value = false;
};

const callProtectedFunction = async () => {
  try {
    const functions = getFunctions($firebase);
    const myProtectedFunction = httpsCallable(functions, 'myProtectedFunction');
    
    // Firebase SDK will automatically include App Check token
    const result = await myProtectedFunction({ data: 'test' });
    functionResult.value = result.data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  }
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.verification-section {
  margin: 40px 0;
  text-align: center;
}

.protected-content {
  margin: 40px 0;
  text-align: center;
}

.error {
  color: red;
  margin: 20px 0;
  padding: 10px;
  background-color: #fee;
  border-radius: 4px;
}

.result {
  margin-top: 20px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 4px;
  text-align: left;
}

button {
  padding: 12px 24px;
  font-size: 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 20px 0;
}

button:hover {
  background-color: #45a049;
}
</style>
```

### Nuxt Configuration

Update `nuxt.config.ts`:

```typescript
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
  
  modules: [
    // Add any required modules
  ],
});
```

### Client Environment Variables

Create `.env`:

```env
# Prosopo
PROSOPO_SITE_KEY=your_prosopo_site_key

# Firebase
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id

# Custom Provider
CUSTOM_PROVIDER_URL=http://localhost:3001
```

## Step 4: Protect Firebase Cloud Functions

Create a Firebase Cloud Function that validates App Check tokens:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const myProtectedFunction = functions.https.onCall(async (data, context) => {
  // Verify App Check token
  if (context.app === undefined) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'The function must be called from an App Check verified app.'
    );
  }

  // Your protected logic here
  return {
    message: 'Success! This function is protected by App Check.',
    data: data,
  };
});
```

## Step 5: Deploy and Test

### 1. Start the Custom Provider Server

```bash
cd server
npm start
```

### 2. Start Nuxt Development Server

```bash
npm run dev
```

### 3. Test the Integration

1. Navigate to `http://localhost:3000`
2. Complete the Procaptcha challenge
3. Upon successful verification, the App Check token will be obtained
4. Try calling protected Firebase Cloud Functions

## Architecture Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Nuxt 3    │         │  Custom Provider │         │    Firebase     │
│   Client    │         │     Backend      │         │   Backend       │
└──────┬──────┘         └────────┬─────────┘         └────────┬────────┘
       │                         │                            │
       │  1. Complete Procaptcha │                            │
       │─────────────────────────▶                            │
       │                         │                            │
       │  2. Send Token          │                            │
       │─────────────────────────▶                            │
       │                         │                            │
       │                   3. Verify with                     │
       │                      Prosopo API                     │
       │                         │                            │
       │                   4. Generate App                    │
       │                      Check Token                     │
       │                         │                            │
       │  5. Return App Check Token                          │
       │◀─────────────────────────                            │
       │                         │                            │
       │  6. Call Firebase with App Check Token              │
       │─────────────────────────────────────────────────────▶│
       │                         │                            │
       │                         │                      7. Validate
       │                         │                         Token
       │                         │                            │
       │  8. Return Protected Data                           │
       │◀─────────────────────────────────────────────────────│
```

## Security Considerations

1. **Never expose your Prosopo Secret Key** in client-side code
2. **Use HTTPS** in production for all communications
3. **Implement rate limiting** on your custom provider backend
4. **Set appropriate TTL** for App Check tokens based on your security requirements
5. **Monitor token usage** in Firebase Console
6. **Rotate keys regularly** for both Prosopo and Firebase

## Troubleshooting

### Procaptcha token verification fails

- Verify your Prosopo Site Key and Secret Key are correct
- Ensure the Prosopo server URL is accessible
- Check network requests in browser DevTools

### App Check token generation fails

- Verify Firebase Admin SDK credentials
- Check Firebase App ID is correct
- Ensure your Firebase project has App Check enabled

### Protected functions still fail

- Verify App Check is enforced on the function
- Check App Check token is being sent in requests
- Review Firebase Console logs for errors

## Additional Resources

- [Prosopo Documentation](https://docs.prosopo.io)
- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Custom Provider Implementation Guide](https://firebase.google.com/docs/app-check/custom-provider)

## Support

For Prosopo-specific issues:
- [GitHub Issues](https://github.com/prosopo/captcha/issues)
- [Discord Community](https://prosopo.io/discord)

For Firebase-specific issues:
- [Firebase Support](https://firebase.google.com/support)
