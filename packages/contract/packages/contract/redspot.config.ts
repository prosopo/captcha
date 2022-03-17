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
import '@redspot/patract';
import '@redspot/chai';
import '@redspot/watcher';
import '@redspot/explorer';
import '@redspot/decimals';

import { RedspotUserConfig } from 'redspot/types';

import { contractDefinitions } from './src/definitions';

export default {
  defaultNetwork: 'development',
  contract: {
    ink: {
      docker: false,
      toolchain: 'nightly',
      sources: ['/usr/src/packages/provider/packages/contract/artifacts']
    }
  },
  networks: {
    development: {
      endpoint: 'ws://substrate-node:9944',
      // Use this to contact a localhost version of substrate
      // endpoint: "ws://host.docker.internal:9944",
      gasLimit: '400000000000',
      types: contractDefinitions,
      accounts: [
        '//Alice',
        '//Bob',
        '//Charlie',
        '//Dave',
        '//Eve',
        '//Ferdie'
      ]
    },
    jupiter: {
      endpoint: 'wss://jupiter-poa.elara.patract.io',
      gasLimit: '400000000000',
      accounts: ['//Alice'],
      types: {}
    }

  },
  mocha: {
    timeout: 120000
  },
  docker: {
    sudo: false,
    runTestnet:
            "docker run -p 9944:9944 --rm redspot/contract /bin/bash -c 'canvas --rpc-cors all --tmp --dev --ws-port=9944 --ws-external'"
  }
} as RedspotUserConfig;
