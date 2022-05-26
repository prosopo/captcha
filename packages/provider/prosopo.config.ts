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
import {ProsopoConfig} from './types';

export default {
    logLevel: 'debug',
    defaultEnvironment: 'development',
    contract: {
        abi: '../contract/src/abi/prosopo.json'
    },
    networks: {
        development: {
            endpoint: process.env.SUBSTRATE_NODE_URL,
            contract: {
                address: process.env.CONTRACT_ADDRESS,
                deployer: {
                    address: '//Alice'
                },
                name: 'prosopo'

            },
            accounts: [
                '//Alice',
                '//Bob',
                '//Charlie',
                '//Dave',
                '//Eve',
                '//Ferdie'
            ]
        }
    },
    captchas: {
        solved: {
            count: 1
        },
        unsolved: {
            count: 1
        }
    },
    captchaSolutions: {
        requiredNumberOfSolutions: 3,
        solutionWinningPercentage: 80,
        captchaFilePath: '../data/captchas.json'
    },
    database: {
        development: {
            type: 'mongo',
            endpoint: `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`,
            dbname: process.env.DATABASE_NAME,
        }
    },
    // TODO deprecate local assets resolver -> tests: img server/mock.
    assets : {
        absolutePath: '',
        basePath: ''
    },
    server : {
        baseURL: process.env.API_BASE_URL,
    }

} as ProsopoConfig;
