// Copyright 2021-2023 Prosopo (UK) Ltd.
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

import { LogLevel } from '@prosopo/common'
import { z } from 'zod'

export const DatabaseTypes = z.enum(['mongo', 'mongoMemory'])

export const EnvironmentTypesSchema = z.enum(['development', 'rococo', 'kusama', 'polkadot', 'shiden'])

export type EnvironmentTypes = z.infer<typeof EnvironmentTypesSchema>

// TODO decide if environment should be development / staging / production instead of rococo / kusama / polkadot
export const NetworkNamesSchema = EnvironmentTypesSchema

export type NetworkNames = typeof NetworkNamesSchema

export const DatabaseConfigSchema = z
    .record(
        EnvironmentTypesSchema,
        z.object({
            type: z.string(),
            endpoint: z.string(),
            dbname: z.string(),
            authSource: z.string(),
        })
    )
    .optional()

export const BatchCommitConfigSchema = z.object({
    interval: z.number().positive(),
    maxBatchExtrinsicPercentage: z.number().positive(),
})

export type BatchCommitConfig = z.infer<typeof BatchCommitConfigSchema>

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>

export const ProsopoBaseConfigSchema = z.object({
    logLevel: LogLevel,
    defaultEnvironment: EnvironmentTypesSchema.default(EnvironmentTypesSchema.Values.development),
    // The account with which to query the contract and sign transactions
    account: z.object({
        address: z.string(),
        secret: z.string().optional(),
        password: z.string().optional(),
    }),
})

export const NetworkConfigSchema = z.object({
    endpoint: z.string().url(),
    contract: z.object({
        address: z.string(),
        name: z.string(),
    }),
    accounts: z.array(z.string()).optional(),
})

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>

export const ProsopoNetworksSchema = z.record(NetworkNamesSchema, NetworkConfigSchema.required()).default({
    development: {
        endpoint: 'ws://127.0.0.1:9944',
        contract: {
            address: '',
            name: '',
        },
        accounts: [],
    },
})

export const ProsopoBasicConfigSchema = ProsopoBaseConfigSchema.merge(
    z.object({
        networks: ProsopoNetworksSchema,
        database: DatabaseConfigSchema.optional(),
    })
)

export type ProsopoBasicConfig = z.infer<typeof ProsopoBasicConfigSchema>

export const ProsopoCaptchaCountConfigSchema = z.object({
    solved: z.object({
        count: z.number().positive(),
    }),
    unsolved: z.object({
        count: z.number().nonnegative(),
    }),
})

export const ProsopoImageServerConfigSchema = z.object({
    baseURL: z.string().url(),
    port: z.number().optional().default(9229),
})

export const ProsopoCaptchaSolutionConfigSchema = z.object({
    requiredNumberOfSolutions: z.number().positive().min(2),
    solutionWinningPercentage: z.number().positive().max(100),
    captchaFilePath: z.string(),
    captchaBlockRecency: z.number().positive().min(2),
})

export const ProsopoClientConfigSchema = ProsopoBasicConfigSchema.merge(
    z.object({
        userAccountAddress: z.string().optional(),
        web2: z.boolean(),
        solutionThreshold: z.number().positive().max(100),
        dappName: z.string(),
        serverUrl: z.string().url(),
    })
)

export const ProsopoServerConfigSchema = ProsopoClientConfigSchema

export type ProsopoServerConfig = z.infer<typeof ProsopoServerConfigSchema>

export const AccountCreatorConfigSchema = z.object({
    area: z.object({
        width: z.number().positive(),
        height: z.number().positive(),
    }),
    offsetParameter: z.number().positive(),
    multiplier: z.number().positive(),
    fontSizeFactor: z.number().positive(),
    maxShadowBlur: z.number().positive(),
    numberOfRounds: z.number().positive(),
    seed: z.number().positive(),
})

export type ProsopoClientConfig = z.infer<typeof ProsopoClientConfigSchema>

const ThemeType = z.union([z.literal('light'), z.literal('dark')])

export const ProcaptchaConfigSchema = ProsopoClientConfigSchema.merge(
    z.object({
        accountCreator: AccountCreatorConfigSchema.optional(),
        theme: ThemeType.optional(),
        challengeValidLength: z.number().positive().optional(),
    })
)

export type ProcaptchaClientConfig = z.infer<typeof ProcaptchaConfigSchema>

export const ProsopoConfigSchema = ProsopoBasicConfigSchema.merge(
    z.object({
        captchas: ProsopoCaptchaCountConfigSchema,
        captchaSolutions: ProsopoCaptchaSolutionConfigSchema,
        batchCommit: BatchCommitConfigSchema,
        server: ProsopoImageServerConfigSchema,
    })
)

export type ProsopoConfig = z.infer<typeof ProsopoConfigSchema>
