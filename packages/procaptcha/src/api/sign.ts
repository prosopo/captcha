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
import { blake2AsHex } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'

export const sign = (message: string): { messageHash: string; signature: string } => {
    const keyring = new Keyring({ type: 'ecdsa' })
    const pair = keyring.addFromUri('//Alice')
    const sig = pair.sign(message)
    const signature = u8aToHex(sig)
    const messageHash = blake2AsHex(message)
    return { messageHash, signature }
}
