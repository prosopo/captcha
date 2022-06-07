// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import express from 'express';
import cors from 'cors';
import { URL } from 'url';

// import { mnemonicValidate } from '@polkadot/util-crypto';

import { prosopoRouter } from '../api';
import { LocalAssetsResolver } from '../assets';
import { Environment } from '../env';
import { ERRORS, handleErrors } from '../errors';
// import { processArgs } from './argv';

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import dotenv from 'dotenv';

dotenv.config();

function startApi(env: Environment) {
  const apiApp = express();
  const apiPort = new URL(process.env.API_BASE_URL as string).port || 3000;

  apiApp.use(cors());
  apiApp.use(prosopoRouter(env));
  apiApp.use(express.json());

  if (env.assetsResolver instanceof LocalAssetsResolver) {
    env.assetsResolver.injectMiddleware(apiApp); //
  }

  apiApp.use(handleErrors);
  apiApp.listen(apiPort, () => {
    env.logger.info(`Prosopo app listening at http://localhost:${apiPort}`);
  });
}

function startImgSrv() {
  const imgSrv = express();
  const imgSrvPort = 4000;
  
  imgSrv.use('/img', express.static('../../data/img'));
  
  imgSrv.get('/', (req, res) => {
    res.send('Image server');
  });
  
  imgSrv.listen(imgSrvPort, () => {
    console.log(`Image server running on port ${imgSrvPort} serving images from /data/img`);
  });
}

const argv = yargs(hideBin(process.argv)).argv;


// TODO: Arguably ./argv.processArgs.command
async function start () {

  if (!process.env.PROVIDER_MNEMONIC) {
    throw new Error(ERRORS.GENERAL.MNEMONIC_UNDEFINED.message);
  }

  const env = new Environment(process.env.PROVIDER_MNEMONIC);
  await env.isReady();
  startApi(env);

  // if (argv['img'])
  startImgSrv();

}

start()
  .catch((error) => {
    console.error(error);
  });
