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

// Copyright 2017-2023 @polkadot/react-signer authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { objectSpread } from '@polkadot/util/object'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { Registry, SignerPayloadJSON } from '@polkadot/types/types'
import type { Signer, SignerResult } from '@polkadot/api/types'

let id = 0

export default class AccountSigner implements Signer {
    readonly #keyringPair: KeyringPair
    readonly #registry: Registry

    constructor(registry: Registry, keyringPair: KeyringPair) {
        this.#keyringPair = keyringPair
        this.#registry = registry
    }

    public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
        return new Promise((resolve): void => {
            const signed = this.#registry
                .createType('ExtrinsicPayload', payload, { version: payload.version })
                .sign(this.#keyringPair)

            resolve(objectSpread({ id: ++id }, signed))
        })
    }
}
