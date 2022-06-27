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
// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { CronJob } from 'cron';

import { mnemonicValidate } from '@polkadot/util-crypto';

import { Tasks } from './tasks/tasks';
import { Environment } from './env';

async function main () {
  mnemonicValidate(process.env.PROVIDER_MNEMONIC as string);
  const env = new Environment(process.env.PROVIDER_MNEMONIC!);

  await env.isReady();

  const tasks = new Tasks(env);
  const job = new CronJob(process.argv[2], () => {
    env.logger.debug('It works....');
    tasks.calculateCaptchaSolutions().catch((err) => {
      env.logger.error(err);
    });
  });

  job.start();
}

main().catch((error) => {
  console.error(error);
});
