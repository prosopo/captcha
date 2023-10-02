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
import {
    BatchCommitConfigSchema,
    ProsopoCaptchaCountConfigSchema,
    ProsopoCaptchaSolutionConfigSchema,
    ProsopoConfig,
    ProsopoConfigSchema,
    ProsopoNetworksSchema,
} from '@prosopo/types'
import { KeypairType } from '@polkadot/util-crypto/types'
import { ProsopoEnvError } from '@prosopo/common'
import prosopoConfig from './prosopo.config.js'

export function getSs58Format(): number {
    return parseInt(process.env.SS58_FORMAT || '') || 42
}

export function getPairType(): KeypairType {
    return (process.env.PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType)
}

export function getSecret(who?: string): string {
    if (!who) {
        who = 'PROVIDER'
    } else {
        who = who.toUpperCase()
    }
    const secret =
        process.env[`${who}_MNEMONIC`] ||
        process.env[`${who}_SEED`] ||
        process.env[`${who}_URI`] ||
        process.env[`${who}_JSON`]
    if (!secret) {
        throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
    }
    return secret
}

export function getConfig(
    networksConfig?: typeof ProsopoNetworksSchema,
    captchaSolutionsConfig?: typeof ProsopoCaptchaSolutionConfigSchema,
    batchCommitConfig?: typeof BatchCommitConfigSchema,
    captchaServeConfig?: typeof ProsopoCaptchaCountConfigSchema
): ProsopoConfig {
    return ProsopoConfigSchema.parse(
        prosopoConfig(networksConfig, captchaSolutionsConfig, batchCommitConfig, captchaServeConfig)
    )
}
