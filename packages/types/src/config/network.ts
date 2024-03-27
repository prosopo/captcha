import { literal, number, object, string, union, enum as zEnum, type infer as zInfer } from 'zod'
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
import { enumMap } from './enumMap.js'
export const NetworkNamesSchema = zEnum(['development', 'rococo', 'shiden'])

export type NetworkNames = zInfer<typeof NetworkNamesSchema>

export const NetworkPairTypeSchema = union([
    literal('sr25519'),
    literal('ed25519'),
    literal('ecdsa'),
    literal('ethereum'),
])
export const NetworkConfigSchema = object({
    endpoint: string().url(),
    contract: object({
        address: string(),
        name: string(),
    }),
    pairType: NetworkPairTypeSchema,
    ss58Format: number().positive().default(42),
})

export type NetworkConfig = zInfer<typeof NetworkConfigSchema>

// Force all enum keys to be present in record: https://github.com/colinhacks/zod/issues/1092.
// Unfortunately there doesn't seem to be a way to force at least one key, but not all keys, to be present. See attempt
// below using refine / transform and reported issue: https://github.com/colinhacks/zod/issues/2528
export const ProsopoNetworksSchema = enumMap(
    NetworkNamesSchema,
    NetworkConfigSchema.required({
        endpoint: true,
        pairType: true,
        ss58Format: true,
    })
)
