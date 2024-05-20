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

import { NetworkNamesSchema, ProsopoNetworksSchema } from './network.js'
import { boolean } from 'zod'
import { input } from 'zod'
import { literal } from 'zod'
import { number } from 'zod'
import { object } from 'zod'
import { output } from 'zod'
import { record, string, enum as zEnum } from 'zod'
import { union } from 'zod'
import { infer as zInfer } from 'zod'
import networks from '../networks/index.js'

const LogLevel = zEnum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'log'])

export const DatabaseTypes = zEnum(['mongo', 'mongoMemory'])

export const EnvironmentTypesSchema = zEnum(['development', 'staging', 'production'])

export type EnvironmentTypes = zInfer<typeof EnvironmentTypesSchema>

// The timeframe in which a user must complete an image captcha (1 minute)
export const DEFAULT_IMAGE_CAPTCHA_TIMEOUT = 60 * 1000
// The timeframe in which an image captcha solution remains valid on the page before timing out (2 minutes)
export const DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT = 60 * 2 * 1000
// The time in milliseconds that a cached image captcha solution is valid for (15 minutes)
export const DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED = 60 * 15 * 1000
// The timeframe in which a pow captcha must be completed and verified (2 minutes)
export const DEFAULT_POW_CAPTCHA_TIMEOUT = 60 * 2 * 1000
// The timeframe in which a pow captcha solution remains valid on the page before timing out (1 minute)
export const DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT = 60 * 1000
// The time in milliseconds since the last correct captcha recorded in the contract (15 minutes), after which point, the
// user will be required to complete another captcha
export const DEFAULT_MAX_VERIFIED_TIME_CONTRACT = 60 * 15 * 1000

export const DatabaseConfigSchema = record(
    EnvironmentTypesSchema,
    object({
        type: string(),
        endpoint: string(),
        dbname: string(),
        authSource: string(),
    })
)

export const BatchCommitConfigSchema = object({
    interval: number().positive().optional().default(300),
    maxBatchExtrinsicPercentage: number().positive().optional().default(59),
})

export type BatchCommitConfigInput = input<typeof BatchCommitConfigSchema>
export type BatchCommitConfigOutput = output<typeof BatchCommitConfigSchema>

export type DatabaseConfigInput = input<typeof DatabaseConfigSchema>
export type DatabaseConfigOutput = output<typeof DatabaseConfigSchema>

export const ProsopoBaseConfigSchema = object({
    logLevel: LogLevel.optional().default(LogLevel.enum.info),
    defaultEnvironment: EnvironmentTypesSchema.default(EnvironmentTypesSchema.Values.production),
    defaultNetwork: NetworkNamesSchema.default(NetworkNamesSchema.Values.rococo),
    // The account with which to query the contract.merge sign transactions
    account: object({
        address: string().optional(),
        secret: string().optional(),
        password: string().optional(),
    }),
})

export const ProsopoBasicConfigSchema = ProsopoBaseConfigSchema.merge(
    object({
        networks: ProsopoNetworksSchema.default(networks),
        database: DatabaseConfigSchema.optional(),
        devOnlyWatchEvents: boolean().optional(),
    })
)
export type ProsopoNetworksSchemaInput = input<typeof ProsopoNetworksSchema>
export type ProsopoNetworksSchemaOutput = output<typeof ProsopoNetworksSchema>

export type ProsopoBasicConfigInput = input<typeof ProsopoBasicConfigSchema>
export type ProsopoBasicConfigOutput = output<typeof ProsopoBasicConfigSchema>

export const ProsopoCaptchaCountConfigSchema = object({
    solved: object({
        count: number().positive(),
    })
        .optional()
        .default({ count: 1 }),
    unsolved: object({
        count: number().nonnegative(),
    })
        .optional()
        .default({ count: 1 }),
})

export type ProsopoCaptchaCountConfigSchemaInput = input<typeof ProsopoCaptchaCountConfigSchema>

export const ProsopoImageServerConfigSchema = object({
    baseURL: string().url(),
    port: number().optional().default(9229),
})

export const ProsopoCaptchaSolutionConfigSchema = object({
    requiredNumberOfSolutions: number().positive().min(2),
    solutionWinningPercentage: number().positive().max(100),
    captchaBlockRecency: number().positive().min(2),
})

export const ProsopoClientConfigSchema = ProsopoBasicConfigSchema.merge(
    object({
        userAccountAddress: string().optional(),
        web2: boolean().optional().default(true),
        solutionThreshold: number().positive().max(100).optional().default(80),
        dappName: string().optional().default('ProsopoClientDapp'),
        serverUrl: string().optional(),
    })
)

export const CaptchaTimeoutSchema = object({
    image: object({
        // Set this to a default value for the frontend
        challengeTimeout: number().positive().optional().default(DEFAULT_IMAGE_CAPTCHA_TIMEOUT),
        // Set this to a default value for the frontend
        solutionTimeout: number().positive().optional().default(DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT),
        cachedTimeout: number().positive().optional().default(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED),
    }),
    pow: object({
        challengeTimeout: number().positive().optional().default(DEFAULT_POW_CAPTCHA_TIMEOUT),
        solutionTimeout: number().positive().optional().default(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT),
    }),
    contract: object({
        maxVerifiedTime: number().positive().optional().default(DEFAULT_MAX_VERIFIED_TIME_CONTRACT),
    }),
})

export type CaptchaTimeoutInput = input<typeof CaptchaTimeoutSchema>

const defaultCaptchaTimeouts: CaptchaTimeoutInput = {
    image: {
        challengeTimeout: DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
        solutionTimeout: DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
        cachedTimeout: DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
    },
    pow: {
        challengeTimeout: DEFAULT_POW_CAPTCHA_TIMEOUT,
        solutionTimeout: DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
    },
    contract: {
        maxVerifiedTime: DEFAULT_MAX_VERIFIED_TIME_CONTRACT,
    },
}

export type CaptchaTimeoutOutput = output<typeof CaptchaTimeoutSchema>

export const ProsopoServerConfigSchema = ProsopoClientConfigSchema.merge(
    object({
        serverUrl: string().url().optional(),
        captchas: CaptchaTimeoutSchema.optional().default(defaultCaptchaTimeouts),
    })
)

export type ProsopoServerConfigInput = input<typeof ProsopoServerConfigSchema>
export type ProsopoServerConfigOutput = output<typeof ProsopoServerConfigSchema>

export const AccountCreatorConfigSchema = object({
    area: object({
        width: number().positive(),
        height: number().positive(),
    }),
    offsetParameter: number().positive(),
    multiplier: number().positive(),
    fontSizeFactor: number().positive(),
    maxShadowBlur: number().positive(),
    numberOfRounds: number().positive(),
    seed: number().positive(),
})

export type ProsopoClientConfigInput = input<typeof ProsopoClientConfigSchema>
export type ProsopoClientConfigOutput = output<typeof ProsopoClientConfigSchema>

const ThemeType = union([literal('light'), literal('dark')])

export const ProcaptchaConfigSchema = ProsopoClientConfigSchema.and(
    object({
        accountCreator: AccountCreatorConfigSchema.optional(),
        theme: ThemeType.optional(),
        captchas: CaptchaTimeoutSchema.optional().default(defaultCaptchaTimeouts),
    })
)

export type ProcaptchaClientConfigInput = input<typeof ProcaptchaConfigSchema>
export type ProcaptchaClientConfigOutput = output<typeof ProcaptchaConfigSchema>

export const ProsopoConfigSchema = ProsopoBasicConfigSchema.merge(
    object({
        captchas: ProsopoCaptchaCountConfigSchema.optional().default({
            solved: { count: 1 },
            unsolved: { count: 0 },
        }),
        captchaSolutions: ProsopoCaptchaSolutionConfigSchema.optional().default({
            requiredNumberOfSolutions: 3,
            solutionWinningPercentage: 80,
            captchaBlockRecency: 10,
        }),
        batchCommit: BatchCommitConfigSchema.optional().default({
            interval: 300,
            maxBatchExtrinsicPercentage: 59,
        }),
        server: ProsopoImageServerConfigSchema,
        mongoEventsUri: string().optional(),
    })
)

export type ProsopoConfigInput = input<typeof ProsopoConfigSchema>
export type ProsopoConfigOutput = output<typeof ProsopoConfigSchema>
