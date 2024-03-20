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
/* This file is auto-generated */

import { txSignAndSend } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/proxy.js'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue } from '@prosopo/typechain-types'
import type { KeyringPair } from '@polkadot/keyring/types'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { decodeEvents } from '../shared/utils.js'
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/proxy.json' assert { type: 'json' }
import type { EventRecord } from '@polkadot/types/interfaces'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __keyringPair: KeyringPair
    readonly __apiPromise: ApiPromise

    constructor(apiPromise: ApiPromise, nativeContract: ContractPromise, keyringPair: KeyringPair) {
        this.__apiPromise = apiPromise
        this.__nativeContract = nativeContract
        this.__keyringPair = keyringPair
    }

    /**
     * forward
     *
     */
    forward(__options?: GasLimitAndRequiredValue) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'forward',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * handler
     *
     * @param { ArgumentTypes.ProxyMessages } msg,
     */
    handler(msg: ArgumentTypes.ProxyMessages, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'handler',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [msg],
            __options
        )
    }
}
