// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import express from 'express';
import cors from 'cors';
import { URL } from 'url';

// import { mnemonicValidate } from '@polkadot/util-crypto';

import { prosopoRouter } from '../src/api';
import { LocalAssetsResolver } from '../src/assets';
import { Environment } from '../src/env';
import { MockEnvironment } from "../tests/mocks/mockenv";
import { ERRORS, handleErrors } from '../src/errors';
// import { processArgs } from './argv';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import dotenv from 'dotenv';
import { ProsopoEnvironment } from '../src/types/env';

import { Server } from 'http';

dotenv.config();

let apiAppSrv: Server;
let imgAppSrv: Server;

function startApi(env: ProsopoEnvironment) {
    const apiApp = express();
    const apiPort = new URL(process.env.API_BASE_URL as string).port || 3000;

    apiApp.use(cors());
    apiApp.use(express.json());
    apiApp.use(prosopoRouter(env));

    if (env.assetsResolver instanceof LocalAssetsResolver) {
        env.assetsResolver.injectMiddleware(apiApp); //
    }

    apiApp.use(handleErrors);
    apiAppSrv = apiApp.listen(apiPort, () => {
        env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`);
    });
}

function startImg() {
    const imgApp = express();
    const imgPort = 4000;

    imgApp.use('/img', express.static('../../data/img'));

    imgApp.get('/', (req, res) => {
        res.send('Image server');
    });

    imgAppSrv = imgApp.listen(imgPort, () => {
        console.log(`Image server running on port ${imgPort} serving images from /data/img`);
    });
}

// const argv = yargs(hideBin(process.argv)).argv;

// TODO: Arguably ./argv.processArgs.command
async function start (nodeEnv: string) {

    let env: ProsopoEnvironment;

    if (nodeEnv !== 'test') {
        if (!process.env.PROVIDER_MNEMONIC) {
            throw new Error(ERRORS.GENERAL.MNEMONIC_UNDEFINED.message);
        }
        env = new Environment(process.env.PROVIDER_MNEMONIC);
    } else {
        env = new MockEnvironment();
    }

    await env.isReady();
    startApi(env);

    // if (argv['img'])
    startImg();
}

function stop() {
    apiAppSrv.close();
    imgAppSrv.close();
}

start(process.env.NODE_ENV || 'development')
    .catch((error) => {
        console.error(error);
    });
