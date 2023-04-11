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

import { z } from 'zod'
import { LogLevel } from 'consola'

export enum DatabaseTypes {
    mongo = 'mongo',
}

export enum EnvironmentTypes {
    development = 'development',
}

export const DatabaseConfigSchema = z.object({
    [EnvironmentTypes.development]: z.object({
        type: z.nativeEnum(DatabaseTypes),
        endpoint: z.string(),
        dbname: z.string(),
        authSource: z.string(),
    }),
})

export const BatchCommitConfigSchema = z.object({
    interval: z.number().positive(),
    maxBatchExtrinsicPercentage: z.number().positive(),
})

export type BatchCommitConfig = z.infer<typeof BatchCommitConfigSchema>

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>

export const ProsopoConfigSchema = z.object({
    logLevel: z.nativeEnum(LogLevel),
    contract: z.object({ abi: z.string() }),
    defaultEnvironment: z.nativeEnum(EnvironmentTypes),
    account: z.object({
        password: z.string().optional(),
    }),
    networks: z.object({
        development: z.object({
            endpoint: z.string().url(),
            contract: z.object({
                address: z.string(),
                name: z.string(),
            }),
            accounts: z.array(z.string()),
        }),
    }),
    captchas: z.object({
        solved: z.object({
            count: z.number().positive(),
        }),
        unsolved: z.object({
            count: z.number().nonnegative(),
        }),
    }),
    captchaSolutions: z.object({
        requiredNumberOfSolutions: z.number().positive().min(2),
        solutionWinningPercentage: z.number().positive().max(100),
        captchaFilePath: z.string(),
        captchaBlockRecency: z.number().positive().min(2),
    }),
    batchCommit: BatchCommitConfigSchema,
    database: DatabaseConfigSchema,
    assets: z.object({
        absolutePath: z.string(),
        basePath: z.string(),
    }),
    server: z.object({
        baseURL: z.string().url(),
    }),
})

export type ProsopoConfig = z.infer<typeof ProsopoConfigSchema>
