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
/* This file is auto-generated */

import { txSignAndSend } from '@727-ventures/typechain-types'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue } from '@727-ventures/typechain-types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type BN from 'bn.js'
// @ts-ignore
import { EventRecord } from '@polkadot/types/interfaces'
import { decodeEvents } from '../shared/utils.js'
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/proxy.json'

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
     * getAuthor
     *
     */
    getAuthor(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getAuthor',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getAdmin
     *
     */
    getAdmin(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getAdmin',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getProxyDestination
     *
     */
    getProxyDestination(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getProxyDestination',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * proxyWithdraw
     *
     * @param { (string | number | BN) } amount,
     */
    proxyWithdraw(amount: string | number | BN, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'proxyWithdraw',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [amount],
            __options
        )
    }

    /**
     * proxyTerminate
     *
     */
    proxyTerminate(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'proxyTerminate',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * proxySetCodeHash
     *
     * @param { Array<(number | string | BN)> } codeHash,
     */
    proxySetCodeHash(codeHash: Array<number | string | BN>, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'proxySetCodeHash',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [codeHash],
            __options
        )
    }

    /**
     * proxyForward
     *
     */
    proxyForward(__options?: GasLimitAndRequiredValue) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'proxyForward',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }
}
