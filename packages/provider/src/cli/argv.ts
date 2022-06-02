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

import parser from 'cron-parser';
import pm2 from 'pm2';
import { cwd } from 'process';
const yargs = require('yargs')

import { Compact, u128 } from '@polkadot/types';

import { ERRORS } from '../errors';
import { Tasks } from '../tasks/tasks';
import { ProsopoEnvironment } from '../types/env';
import { encodeStringAddress } from '../util';
import {PayeeSchema, Payee} from "@prosopo/contract";

const validateAddress = (argv) => {
  const address = encodeStringAddress(argv.address as string);

  return { address };
};

const validatePayee = (argv) => {
  try {
    const payeeArg: string = argv.payee[0].toUpperCase() + argv.payee.slice(1).toLowerCase() || '';
    const payee = PayeeSchema.parse(payeeArg);

    return { payee };
  } catch (error) {
    throw new Error(`${ERRORS.CLI.PARAMETER_ERROR.message}::value::${argv.payee}`);
  }
};

const validateValue = (argv) => {
  if (typeof argv.value !== 'number') {
    throw new Error(`${ERRORS.CLI.PARAMETER_ERROR.message}::value::${argv.value}`);
  }
  const value: Compact<u128> = argv.value as Compact<u128>;
  return { value };
};

const validateScheduleExpression = (argv) => {
  if (typeof argv.schedule === 'string') {
    const result = parser.parseString(argv.schedule as string);

    if (argv.schedule in result.errors) {
      throw new Error(`${ERRORS.CLI.PARAMETER_ERROR.message}::value::${argv.schedule}`);
    }

    return { schedule: argv.schedule as string };
  } else {
    return { schedule: null };
  }
};

export function processArgs (args, env: ProsopoEnvironment) {
  const tasks = new Tasks(env);
  const logger = env.logger;
  return yargs
    .usage('Usage: $0 [global options] <command> [options]')
    .option('api', { demand: false, default: false, type: 'boolean' })
    .command(
      'provider_register',
      'Register a Provider',
      (yargs) => yargs
        .option('origin', { type: 'string', demand: true, desc: 'The provider service origin (URI)' })
        .option('fee', { type: 'number', demand: true, desc: 'The fee to pay per solved captcha' })
        .option('payee', { type: 'string', demand: true, desc: 'The person who receives the fee (`Provider` or `Dapp`)' })
        .option('address', { type: 'string', demand: true, desc: 'The AccountId of the Provider' }),
      async (argv) => {
        const result = await tasks.providerRegister(argv.origin, argv.fee, argv.payee as Payee, argv.address);

        logger.info(JSON.stringify(result, null, 2));
      },
      [validateAddress, validatePayee]
    )
    .command(
      'provider_update',
      'Update a Provider',
      (yargs) => yargs
        .option('origin', { type: 'string', demand: true, desc: 'The provider service origin (URI)' })
        .option('fee', { type: 'number', demand: true, desc: 'The fee to pay per solved captcha' })
        .option('payee', { type: 'string', demand: true, desc: 'The person who receives the fee (`Provider` or `Dapp`)' })
        .option('address', { type: 'string', demand: true, desc: 'The AccountId of the Provider' })
        .option('value', { type: 'number', demand: false, desc: 'The value to stake in the contract' }),
      async (argv) => {
        const result = await tasks.providerUpdate(argv.origin, argv.fee, argv.payee as Payee, argv.address, argv.value);

        logger.info(JSON.stringify(result, null, 2));
      },
      [validateAddress, validatePayee]
    )
    .command(
      'provider_deregister',
      'Deregister a Provider',
      (yargs) => yargs
        .option('address', { type: 'string', demand: true, desc: 'The AccountId of the Provider' }),
      async (argv) => {
        try {
          const result = await tasks.providerDeregister(argv.address);

          logger.info(JSON.stringify(result, null, 2));
        } catch (err) {
          logger.error(err);
        }
      },
      [validateAddress]
    )
    .command(
      'provider_unstake',
      'Unstake funds as a Provider',
      (yargs) => yargs
        .option('value', { type: 'number', demand: true, desc: 'The value to unstake from the contract' }),
      async (argv) => {
        try {
          const result = await tasks.providerUnstake(argv.value);

          logger.info(JSON.stringify(result, null, 2));
        } catch (err) {
          logger.error(err);
        }
      },
      [validateValue]
    )
    .command(
      'provider_add_data_set',
      'Add a dataset as a Provider',
      (yargs) => yargs
        .option('file', { type: 'string', demand: true, desc: 'The file path of a JSON dataset file' }),
      async (argv) => {
        try {
          const result = await tasks.providerAddDataset(argv.file);

          logger.info(JSON.stringify(result, null, 2));
        } catch (err) {
          logger.error(err);
        }
      },
      []
    )
    .command(
      'provider_accounts',
      'List all provider accounts',
      (yargs) => yargs,
      async () => {
        try {
          const result = await tasks.getProviderAccounts();

          logger.info(JSON.stringify(result, null, 2));
        } catch (err) {
          logger.error(err);
        }
      },
      []
    )
    .command(
      'dapp_accounts',
      'List all dapp accounts',
      (yargs) => yargs,
      async () => {
        try {
          const result = await tasks.getDappAccounts();

          logger.info(JSON.stringify(result, null, 2));
        } catch (err) {
          logger.error(err);
        }
      },
      []
    )
    .command(
      'provider_details',
      'List details of a single Provider',
      (yargs) => yargs
        .option('address', { type: 'string', demand: true, desc: 'The AccountId of the Provider' }),
      async (argv) => {
        try {
          const result = await tasks.getProviderDetails(argv.address);

          logger.info(JSON.stringify(result, null, 2));
        } catch (err) {
          logger.error(err);
        }
      },
      [validateAddress]
    )
    .command(
      'dapp_details',
      'List details of a single Dapp',
      (yargs) => yargs
        .option('address', { type: 'string', demand: true, desc: 'The AccountId of the Dapp' }),
      async (argv) => {
        try {
          const result = await tasks.getDappDetails(argv.address);

          logger.info(JSON.stringify(result, null, 2));
        } catch (err) {
          logger.error(err);
        }
      },
      [validateAddress]
    )
    .command(
      'calculate_captcha_solutions',
      'Calculate captcha solutions',
      (yargs) => yargs
        .option('schedule', { type: 'string', demand: false, desc: 'A Recurring schedule expression' }),
      async (argv) => {
        if (argv.schedule) {
          pm2.connect((err) => {
            if (err) {
              console.error(err);
              process.exit(2);
            }

            pm2.start({
              script: `ts-node scheduler.js ${JSON.stringify(argv.schedule)}`,
              name: 'scheduler',
              cwd: cwd() + '/build/src'
            }, (err, apps) => {
              if (err) {
                console.error(err);

                return pm2.disconnect();
              }

              logger.info(apps);
              process.exit();
            });
          });
        } else {
          await tasks.calculateCaptchaSolutions();
        }
      },
      [validateScheduleExpression]
    )
    .argv;
}
