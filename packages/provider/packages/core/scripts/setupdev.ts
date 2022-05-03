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
import yargs from 'yargs';

import { KeyringPair } from '@polkadot/keyring/types';
import { randomAsHex } from '@polkadot/util-crypto';

import { Environment } from '../src/env';
import { TestAccount, TestDapp, TestProvider } from '../tests/mocks/accounts';
import { approveOrDisapproveCommitment, sendFunds, setupDapp, setupDappUser, setupProvider } from '../tests/mocks/setup';
import {Payee} from "@prosopo/contract";

require('dotenv').config();

const ENVVARS = ['PROVIDER_MNEMONIC', 'DAPP_CONTRACT_ADDRESS'];

// Some default accounts that are setup in the contract for development purposes

export const PROVIDER: TestProvider = {
  serviceOrigin: 'http://localhost:8282' + randomAsHex().slice(0, 8), // make it "unique"
  fee: 10,
  payee: Payee.Provider,
  stake: Math.pow(10, 12),
  datasetFile: '/usr/src/data/captchas.json',
  mnemonic: process.env.PROVIDER_MNEMONIC || '',
  address: process.env.PROVIDER_ADDRESS || '',
  captchaDatasetId: ''
};

export const DAPP: TestDapp = {
  serviceOrigin: 'http://localhost:9393',
  mnemonic: '//Ferdie',
  contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '',
  optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
  fundAmount: Math.pow(10, 12)
};

export const DAPP_USER: TestAccount = {
  mnemonic: '//Charlie',
  address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
};

/*
 * Seed the contract with some dummy data
 */
async function run () {
  const env = new Environment('//Alice');
  await env.isReady();
  env.logger.info('env ready');
  ENVVARS.map((envvar) => {
    if (!envvar) {
      throw new Error(`Environment Variable ${envvar} is not set`);
    }

    return undefined;
  });
  await processArgs(env);
  process.exit();
}

async function processArgs (env) {
  // https://github.com/yargs/yargs/issues/1069#issuecomment-709693413
  const logger = env.logger;
  return new Promise((resolve, reject) => {
    try {
      yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command(
          {
            command: 'provider',
            describe: 'Setup a Provider',
            builder: (yargs) => {
              return yargs;
            },
            handler: async () => {
              logger.info("trying to add keyring pair")
              const providerKeyringPair: KeyringPair = await env.contractInterface.network.keyring.addFromMnemonic(PROVIDER.mnemonic);
              logger.info('sending funds...');
              await sendFunds(env, providerKeyringPair.address, 'Provider', 100000000000000000n);
              logger.info('setting up provider...');
              PROVIDER.address = providerKeyringPair.address;

              return await setupProvider(env, PROVIDER);
            }
          }
        )
        .command('dapp', 'Setup a Dapp',
          (yargs) => {
            return yargs;
          }, async () => {
            await setupDapp(env, DAPP);
          }
        )
        .command('user', 'Submit and approve Dapp User solution commitments', (yargs) => {
          return yargs
            .option('approve', { type: 'boolean', demand: false })
            .option('disapprove', { type: 'boolean', demand: false });
        }, async (argv) => {
          const solutionHash: string | undefined = await setupDappUser(env, DAPP_USER, PROVIDER, DAPP);
          const approve = !!argv.approve;

          if ((argv.approve || argv.disapprove) && solutionHash !== undefined) {
            await approveOrDisapproveCommitment(env, solutionHash, approve, PROVIDER);
          }
        }
        ).onFinishCommand(async (r) => resolve(r))
        .exitProcess(false)
        .argv;
    } catch (e) {
      reject(e);
    }
  });
}

run().catch((err) => {
  throw new Error(`Setup dev error: ${err}`);
});
