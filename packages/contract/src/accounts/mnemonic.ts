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
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { mnemonicGenerate } from '@polkadot/util-crypto/mnemonic'

/** Generate a mnemonic, returning the mnemonic and associated address
 * @param keyring
 * @param pairType
 */
export async function generateMnemonic(keyring?: Keyring, pairType?: KeypairType): Promise<[string, string]> {
    if (!keyring) {
        keyring = new Keyring({ type: pairType || 'sr25519' })
    }
    await cryptoWaitReady()
    const mnemonic = mnemonicGenerate()
    const account = keyring.addFromMnemonic(mnemonic)
    return [mnemonic, account.address]
}
