import type { ApiPromise } from '@polkadot/api/promise/Api'
import { Keyring } from '@polkadot/keyring'
import type { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types'
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
import type { AccountId } from '@polkadot/types/interfaces'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { mnemonicValidate } from '@polkadot/util-crypto/mnemonic'
import type { KeypairType } from '@polkadot/util-crypto/types'
import { hexToU8a } from '@polkadot/util/hex'
import { isHex } from '@polkadot/util/is'
import { ProsopoEnvError } from '@prosopo/common'
import { type NetworkConfig, NetworkPairTypeSchema } from '@prosopo/types'

export async function getPairAsync(
    networkConfig?: NetworkConfig,
    secret?: string,
    account?: string | Uint8Array,
    pairType?: KeypairType,
    ss58Format?: number
): Promise<KeyringPair> {
    await cryptoWaitReady()
    return getPair(networkConfig, secret, account, pairType, ss58Format)
}

export function getPair(
    networkConfig?: NetworkConfig,
    secret?: string,
    account?: string | Uint8Array,
    pairType?: KeypairType,
    ss58Format?: number
): KeyringPair {
    if (networkConfig) {
        pairType = networkConfig.pairType
        ss58Format = networkConfig.ss58Format
    } else if (!pairType || !ss58Format) {
        throw new ProsopoEnvError('GENERAL.NO_PAIR_TYPE_OR_SS58_FORMAT')
    }
    const keyring = new Keyring({ type: pairType, ss58Format })
    if (!secret && account) {
        return keyring.addFromAddress(account)
    }
    if (secret) {
        if (mnemonicValidate(secret)) {
            return keyring.addFromUri(secret)
        }
        if (isHex(secret)) {
            return keyring.addFromSeed(hexToU8a(secret))
        }
        if (secret.startsWith('//')) {
            return keyring.addFromUri(secret)
        }
        try {
            const json = JSON.parse(secret)
            const {
                encoding: { content },
            } = json
            const keyring = new Keyring({ type: content[1], ss58Format })
            return keyring.addFromJson(json as KeyringPair$Json)
        } catch (e) {
            throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
        }
    } else {
        throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
    }
}

export function getReadOnlyPair(api: ApiPromise, userAccount?: string): KeyringPair {
    // 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM is the all zero address
    return getPair(
        undefined,
        undefined,
        userAccount || getZeroAddress(api).toHex(),
        NetworkPairTypeSchema.parse('sr25519'),
        api.registry.chainSS58
    )
}

export function getZeroAddress(api: ApiPromise): AccountId {
    return api.registry.createType('AccountId', new Uint8Array(new Array(32).fill(0)))
}
