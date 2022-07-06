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
import { Environment } from '../src/env';
import { sendFunds } from '../tests/mocks/setup';

require('dotenv').config();

async function main (account: string) {
  const env = new Environment('//Alice');
  await env.isReady();
  await sendFunds(env, account, 'Provider', 100000000000000000n)
  process.exit();
}

main(process.argv.slice(2)[0].trim())
  .catch((error) => {
    console.error(error);
    process.exit();
  });
