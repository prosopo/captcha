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
import { KeypairType } from '@polkadot/util-crypto/types'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types'
import { NetworkConfigSchema, ProsopoBasicConfig } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { cryptoWaitReady, mnemonicValidate } from '@polkadot/util-crypto'
import { hexToU8a, isHex } from '@polkadot/util'

export async function getPair(
    secret: string,
    config?: ProsopoBasicConfig,
    pairType?: KeypairType,
    ss58Format?: number
): Promise<KeyringPair> {
    if ((!pairType || !ss58Format) && config) {
        const network = NetworkConfigSchema.parse(config.networks[config.defaultNetwork])
        pairType = network?.pairType || 'sr25519'
        ss58Format = network?.ss58Format || 42
    }
    await cryptoWaitReady()
    const keyring = new Keyring({ type: pairType, ss58Format })
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
}
