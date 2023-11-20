/* This file is auto-generated */

import { buildSubmittableExtrinsic } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/proxy.js'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue } from '@prosopo/typechain-types'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __apiPromise: ApiPromise

    constructor(nativeContract: ContractPromise, apiPromise: ApiPromise) {
        this.__nativeContract = nativeContract
        this.__apiPromise = apiPromise
    }
    /**
     * forward
     *
     */
    forward(__options: GasLimitAndRequiredValue) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'forward', [], __options)
    }

    /**
     * handler
     *
     * @param { ArgumentTypes.ProxyMessages } msg,
     */
    handler(msg: ArgumentTypes.ProxyMessages, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'handler', [msg], __options)
    }
}
