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

import express, { Request, Response } from 'express';
import { ProsopoServer } from '@prosopo/server';
import { getPair } from '@prosopo/keyring';
import { ApiParams, type ProcaptchaToken, type ProsopoServerConfigOutput } from '@prosopo/types';
import { ProsopoEnvError } from '@prosopo/common';
import * as admin from 'firebase-admin';

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

// Enable CORS for development (configure appropriately for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

    if (!prosopoConfig.account.secret) {
      throw new ProsopoEnvError('GENERAL.SECRET_MISSING', {
        context: { missingParams: ['PROSOPO_SITE_PRIVATE_KEY'] },
      });
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
  console.log(`Health check: http://localhost:${PORT}/health`);
});
