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
import { mnemonicValidate } from '@polkadot/util-crypto';
// import { prosopoMiddleware } from '../api';
// import { LocalAssetsResolver } from '../assets';
import { Environment, loadEnv } from '../env';
import { ERRORS } from '../errors';
import { processArgs } from './argv';

import dotenv from 'dotenv';

loadEnv();

async function main () {

  if (!process.env.PROVIDER_MNEMONIC) {
    throw new Error(ERRORS.GENERAL.MNEMONIC_UNDEFINED.message);
  }

  mnemonicValidate(process.env.PROVIDER_MNEMONIC);
  const env = new Environment(process.env.PROVIDER_MNEMONIC);

  await env.isReady();
  await processArgs(process.argv.slice(2), env);

  process.exit();

}

main()
  .catch((error) => {
    console.error(error);
  });
