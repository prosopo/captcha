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
// import {ProsopoConfig} from './types';

import { ProsopoServerConfig } from '@prosopo/api'

export default () =>
    ({
        logLevel: 'debug',
        defaultEnvironment: 'development',
        web2: process.env.REACT_APP_WEB2 || true,
        serverUrl: process.env.REACT_APP_SERVER_URL || 'http://localhost:5000',
        solutionThreshold: process.env.REACT_APP_SOLUTION_THRESHOLD || 0.5,
        dappName: process.env.REACT_APP_DAPP_NAME || 'client-example-server',
        networks: {
            development: {
                endpoint: process.env.SUBSTRATE_NODE_URL || 'ws://localhost:9944',
                prosopoContract: {
                    address: process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS,
                    name: 'prosopo',
                },
                dappContract: {
                    address: process.env.REACT_APP_DAPP_CONTRACT_ADDRESS,
                    name: 'prosopo',
                },
                accounts: ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'],
            },
        },
    } as ProsopoServerConfig)
