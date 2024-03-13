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
import type { KeypairType } from '@polkadot/util-crypto/types'
import { ProsopoEnvError } from '@prosopo/common'

export function getSs58Format(): number {
    return Number.parseInt(process.env.SS58_FORMAT || '') || 42
}

export function getPairType(): KeypairType {
    return (process.env.PROSOPO_PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType)
}

export function getSecret(who?: string): string | undefined {
    if (!who) {
        who = 'PROVIDER'
    } else {
        who = who.toUpperCase()
    }
    return (
        process.env[`PROSOPO_${who}_MNEMONIC`] ||
        process.env[`PROSOPO_${who}_SEED`] ||
        process.env[`PROSOPO_${who}_URI`] ||
        process.env[`PROSOPO_${who}_JSON`]
    )
}

export function getDB(): string {
    if (!process.env.PROSOPO_DATABASE_HOST) {
        throw new ProsopoEnvError('DATABASE.DATABASE_HOST_UNDEFINED')
    }
    return process.env.PROSOPO_DATABASE_HOST
}
