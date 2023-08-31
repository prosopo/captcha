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

import { Keyring } from '@polkadot/keyring'
import { entropyToMnemonic } from '@polkadot/util-crypto/mnemonic/bip39'
import { hexToU8a } from '@polkadot/util'

async function mnemonic() {
    const keyring = new Keyring({ type: 'ed25519', ss58Format: 5 })
    const u8Entropy = hexToU8a('0x7723670fb49be71c81598c2245ae19d1f1685f032f3e98d160b648f23241f41e')
    const mnemonic = entropyToMnemonic(u8Entropy)
    console.log(`Mnemonic: ${mnemonic}`)
    const account = keyring.addFromMnemonic(mnemonic)
    console.log(`Address: ${account.address}`)
    const account2 = keyring.addFromSeed(hexToU8a('0x7723670fb49be71c81598c2245ae19d1f1685f032f3e98d160b648f23241f41e'))
    console.log(`Address: ${account2.address}`)
    const ss58Format = 5
}

mnemonic()

//0x7723670fb49be71c81598c2245ae19d1f1685f032f3e98d160b648f23241f41e
