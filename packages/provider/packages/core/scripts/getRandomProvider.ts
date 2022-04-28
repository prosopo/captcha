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
import { Tasks } from '../src/tasks/tasks';
import {mnemonicGenerate} from "@polkadot/util-crypto";

require('dotenv').config();

async function main () {
    const env = new Environment('//Alice');
    await env.isReady();
    const tasks = new Tasks(env);
    const [mnemonic, address] = await env.contractInterface?.createAccountAndAddToKeyring() || ['','']
    const provider = await tasks.getRandomProvider(address)
    console.log(provider)
    process.exit();
}

main()
    .catch((error) => {
        console.error(error);
        process.exit();
    });
