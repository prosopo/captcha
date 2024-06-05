// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { ProviderEnvironment } from '@prosopo/env'
import { Server } from 'node:net'
import { getDB, getSecret } from './process.env.js'
import { getPairAsync } from '@prosopo/contract'
import { i18nMiddleware } from '@prosopo/common'
import { loadEnv } from './env.js'
import { prosopoAdminRouter, prosopoRouter, prosopoVerifyRouter, storeCaptchasExternally } from '@prosopo/provider'
import cors from 'cors'
import express from 'express'
import getConfig from './prosopo.config.js'

function startApi(env: ProviderEnvironment, admin = false): Server {
    env.logger.info(`Starting Prosopo API`)
    const apiApp = express()
    const apiPort = env.config.server.port

    apiApp.use(cors())
    apiApp.use(express.json({ limit: '50mb' }))
    apiApp.use(i18nMiddleware({}))
    apiApp.use(prosopoRouter(env))
    apiApp.use(prosopoVerifyRouter(env))

    if (admin) {
        apiApp.use(prosopoAdminRouter(env))
    }

    return apiApp.listen(apiPort, () => {
        env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`)
    })
}

export async function start(env?: ProviderEnvironment, admin?: boolean) {
    if (!env) {
        loadEnv()

        // Fail to start api if db is not defined
        getDB()

        const secret = getSecret()
        const config = getConfig(undefined, undefined, undefined, {
            solved: { count: 2 },
            unsolved: { count: 0 },
        })

        const pair = await getPairAsync(config.networks[config.defaultNetwork], secret, '')
        env = new ProviderEnvironment(config, pair)
    }
    await env.isReady()


To modify the batchCommitScheduler function to run the job every hour, you can directly set the cron schedule expression within the code, rather than relying on command-line arguments. Here's how you can do it:

typescript
Copy code
// src/batchCommitScheduler.ts

import { CronJob } from 'cron';
import { KeyringPair } from '@polkadot/keyring/types';
import { ProsopoConfigOutput } from '@prosopo/types';
import { ProsopoEnvError } from '@prosopo/common';
import { ProviderEnvironment } from '@prosopo/env';
import { Tasks } from './tasks/tasks.js';

export async function batchCommitScheduler(pair: KeyringPair, config: ProsopoConfigOutput) {
    const env = new ProviderEnvironment(config, pair);
    await env.isReady();
    if (env.db === undefined) {
        throw new ProsopoEnvError('DATABASE.DATABASE_UNDEFINED');
    }

    const tasks = new Tasks(env);

    // Set the cron schedule to run every hour
    const cronSchedule = '0 * * * *'; // This will run the job at the start of every hour

    const job = new CronJob(cronSchedule, async () => {
        env.logger.debug('storeCommitmentsExternal task....');
        await tasks.storeCommitmentsExternal().catch((err) => {
            env.logger.error(err);
        });
    });

    job.start();
}
Explanation:
Set the cronSchedule directly in the code:

typescript
Copy code
const cronSchedule = '0 * * * *'; // This will run the job at the start of every hour
Use the cronSchedule when creating the CronJob:

typescript
Copy code
const job = new CronJob(cronSchedule, async () => {
    env.logger.debug('storeCommitmentsExternal task....');
    await tasks.storeCommitmentsExternal().catch((err) => {
        env.logger.error(err);
    });
});
Import and start the job in your server startup file (src/server.ts):
Ensure you are importing and calling batchCommitScheduler in your server startup code.

typescript
Copy code
// src/server.ts

import { ProviderEnvironment } from '@prosopo/env';
import { Server } from 'node:net';
import { getDB, getSecret } from './process.env.js';
import { getPairAsync } from '@prosopo/contract';
import { i18nMiddleware } from '@prosopo/common';
import { loadEnv } from './env.js';
import { prosopoAdminRouter, prosopoRouter, prosopoVerifyRouter } from '@prosopo/provider';
import cors from 'cors';
import express from 'express';
import getConfig from './prosopo.config.js';

function startApi(env: ProviderEnvironment, admin = false): Server {
    env.logger.info(`Starting Prosopo API`);
    const apiApp = express();
    const apiPort = env.config.server.port;

    apiApp.use(cors());
    apiApp.use(express.json({ limit: '50mb' }));
    apiApp.use(i18nMiddleware({}));
    apiApp.use(prosopoRouter(env));
    apiApp.use(prosopoVerifyRouter(env));

    if (admin) {
        apiApp.use(prosopoAdminRouter(env));
    }

    return apiApp.listen(apiPort, () => {
        env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`);
    });
}

export async function start(env?: ProviderEnvironment, admin?: boolean) {
    if (!env) {
        loadEnv();

        // Fail to start api if db is not defined
        getDB();

        const secret = getSecret();
        const config = getConfig(undefined, undefined, undefined, {
            solved: { count: 2 },
            unsolved: { count: 0 },
        });

        const pair = await getPairAsync(config.networks[config.defaultNetwork], secret, '');
        env = new ProviderEnvironment(config, pair);
    }
    await env.isReady();

    // Start the scheduled job
    storeCaptchasExternally(env.pair, env.config).catch(err => {
        env.logger.error('Failed to start batch commit scheduler:', err);
    });

    return startApi(env, admin)
}
