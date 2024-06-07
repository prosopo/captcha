// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { NetworkNamesSchema, NetworkPairTypeSchema } from '../config/network.js'
import { ProsopoNetworksSchemaInput } from '../config/index.js'
import { getContract, getEndpoint } from '@prosopo/config'

const pairTypeSr25519 = NetworkPairTypeSchema.parse('sr25519')

const getContractAddress = (defaultAddress?: string): string => {
    const envContractAddress = getContract()
    return envContractAddress ? envContractAddress : defaultAddress ? defaultAddress : 'CONTRACT_NOT_DEPLOYED'
}

export default (): ProsopoNetworksSchemaInput => {
    const envEndpoint = getEndpoint()
    return {
        [NetworkNamesSchema.Values.development]: {
            endpoint: [envEndpoint || 'ws://127.0.0.1:9944'],
            contract: {
                name: 'captcha',
                address: getContractAddress(),
            },
            pairType: pairTypeSr25519,
            ss58Format: 42,
        },
        [NetworkNamesSchema.Values.rococo]: {
            endpoint: [envEndpoint || 'wss://rococo-contracts-rpc.polkadot.io:443'],
            contract: {
                name: 'captcha',
                address: getContractAddress('5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'),
            },
            pairType: pairTypeSr25519,
            ss58Format: 42,
        },
        [NetworkNamesSchema.Values.shiden]: {
            endpoint: [envEndpoint || 'wss://shiden.public.blastapi.io'],
            contract: {
                address: getContractAddress('XpRox5bNg6YV8BHafsuHQ3b8i7gSq3GKPeYLA1b8EZwrDb3'),
                name: 'captcha',
            },
            pairType: pairTypeSr25519,
            ss58Format: 5,
        },
        [NetworkNamesSchema.Values.astar]: {
            endpoint: envEndpoint
                ? [envEndpoint]
                : [
                      'wss://rpc.astar.network',
                      'wss://1rpc.io/astr',
                      'wss://astar.public.blastapi.io',
                      'wss://astar.public.curie.radiumblock.co/ws',
                  ],
            contract: {
                address: getContractAddress('X2NLPj49L4UKWAzX8tS1LHTwioMHNyVurCsvTyUNYxcPuWA'),
                name: 'captcha',
            },
            pairType: pairTypeSr25519,
            ss58Format: 5,
        },
    }
}
