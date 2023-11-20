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
