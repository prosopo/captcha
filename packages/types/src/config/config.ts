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
// See the License for the specific language governing permissions.merge
// limitations under the License.

import { LogLevel } from '@prosopo/common'
import { z } from 'zod'
import networks from '../networks/index.js'

export const DatabaseTypes = z.enum(['mongo', 'mongoMemory'])

export const EnvironmentTypesSchema = z.enum(['development', 'staging', 'production'])

export type EnvironmentTypes = z.infer<typeof EnvironmentTypesSchema>

export const NetworkNamesSchema = z.enum(['development', 'rococo', 'shiden'])

export type NetworkNames = z.infer<typeof NetworkNamesSchema>

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
    .refine((data) => Object.keys(data).length > 0, 'At least one network config required')

export const BatchCommitConfigSchema = z.object({
    interval: z.number().positive().optional().default(300),
    maxBatchExtrinsicPercentage: z.number().positive().optional().default(59),
})

export type BatchCommitConfigInput = z.input<typeof BatchCommitConfigSchema>
export type BatchCommitConfigOutput = z.output<typeof BatchCommitConfigSchema>

export type DatabaseConfigInput = z.input<typeof DatabaseConfigSchema>
export type DatabaseConfigOutput = z.output<typeof DatabaseConfigSchema>

export const ProsopoBaseConfigSchema = z.object({
    logLevel: LogLevel.optional().default(LogLevel.enum.info),
    defaultEnvironment: EnvironmentTypesSchema.optional().default(EnvironmentTypesSchema.Values.production),
    defaultNetwork: NetworkNamesSchema.optional().default(NetworkNamesSchema.Values.rococo),
    // The account with which to query the contract.merge sign transactions
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
    pairType: z.union([z.literal('sr25519'), z.literal('ed25519'), z.literal('ecdsa'), z.literal('ethereum')]),
    ss58Format: z.number().positive().default(42),
})

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>

export const ProsopoNetworksSchema = z
    .record(
        NetworkNamesSchema,
        NetworkConfigSchema.required({
            endpoint: true,
            pairType: true,
            ss58Format: true,
        })
    )
    .refine((data) => Object.keys(data).length > 0, 'Required at least one network config')

export const ProsopoBasicConfigSchema = ProsopoBaseConfigSchema.merge(
    z.object({
        networks: ProsopoNetworksSchema.optional().default(networks),
        database: DatabaseConfigSchema.optional(),
    })
)
export type ProsopoNetworksSchemaInput = z.input<typeof ProsopoNetworksSchema>
export type ProsopoNetworksSchemaOutput = z.output<typeof ProsopoNetworksSchema>

export type ProsopoBasicConfigInput = z.input<typeof ProsopoBasicConfigSchema>
export type ProsopoBasicConfigOutput = z.output<typeof ProsopoBasicConfigSchema>

export const ProsopoCaptchaCountConfigSchema = z.object({
    solved: z
        .object({
            count: z.number().positive(),
        })
        .optional()
        .default({ count: 1 }),
    unsolved: z
        .object({
            count: z.number().nonnegative(),
        })
        .optional()
        .default({ count: 1 }),
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
        web2: z.boolean().optional().default(true),
        solutionThreshold: z.number().positive().max(100).optional().default(80),
        dappName: z.string().optional().default('ProsopoClientDapp'),
        serverUrl: z.string().url(),
    })
).refine((schema) => schema.defaultNetwork in schema.networks, 'defaultNetwork must be in networks')

export const ProsopoServerConfigSchema = ProsopoClientConfigSchema

export type ProsopoServerConfigInput = z.input<typeof ProsopoClientConfigSchema>
export type ProsopoServerConfigOutput = z.output<typeof ProsopoClientConfigSchema>

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

export type ProsopoClientConfigInput = z.input<typeof ProsopoClientConfigSchema>
export type ProsopoClientConfigOutput = z.output<typeof ProsopoClientConfigSchema>

const ThemeType = z.union([z.literal('light'), z.literal('dark')])

export const ProcaptchaConfigSchema = ProsopoClientConfigSchema.and(
    z.object({
        accountCreator: AccountCreatorConfigSchema.optional(),
        theme: ThemeType.optional(),
    })
)

export type ProcaptchaClientConfigInput = z.input<typeof ProcaptchaConfigSchema>
export type ProcaptchaClientConfigOutput = z.output<typeof ProcaptchaConfigSchema>

export const ProsopoConfigSchema = ProsopoBasicConfigSchema.merge(
    z.object({
        captchas: ProsopoCaptchaCountConfigSchema.optional().default({
            solved: { count: 1 },
            unsolved: { count: 1 },
        }),
        captchaSolutions: ProsopoCaptchaSolutionConfigSchema.optional().default({
            requiredNumberOfSolutions: 3,
            solutionWinningPercentage: 80,
            captchaFilePath: '../../data/captchas_big.json',
            captchaBlockRecency: 10,
        }),
        batchCommit: BatchCommitConfigSchema.optional().default({
            interval: 300,
            maxBatchExtrinsicPercentage: 59,
        }),
        server: ProsopoImageServerConfigSchema,
    })
).refine((schema) => schema.defaultNetwork in schema.networks, 'defaultNetwork must be in networks')

export type ProsopoConfigInput = z.input<typeof ProsopoConfigSchema>
export type ProsopoConfigOutput = z.output<typeof ProsopoConfigSchema>
