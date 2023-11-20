/* This file is auto-generated */

import { txSignAndSend } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/common.js'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit } from '@prosopo/typechain-types'
import type { KeyringPair } from '@polkadot/keyring/types'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { decodeEvents } from '../shared/utils.js'
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/common.json' assert { type: 'json' }
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
     * getCaller
     *
     */
    getCaller(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getCaller',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getCallerBytes
     *
     */
    getCallerBytes(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getCallerBytes',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getAccountBytes
     *
     * @param { ArgumentTypes.AccountId } account,
     */
    getAccountBytes(account: ArgumentTypes.AccountId, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getAccountBytes',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [account],
            __options
        )
    }

    /**
     * getGitCommitId
     *
     */
    getGitCommitId(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getGitCommitId',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }
}
