/* This file is auto-generated */

import { buildSubmittableExtrinsic } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/common.js'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit } from '@prosopo/typechain-types'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __apiPromise: ApiPromise

    constructor(nativeContract: ContractPromise, apiPromise: ApiPromise) {
        this.__nativeContract = nativeContract
        this.__apiPromise = apiPromise
    }
    /**
     * getCaller
     *
     */
    getCaller(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getCaller', [], __options)
    }

    /**
     * getCallerBytes
     *
     */
    getCallerBytes(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getCallerBytes', [], __options)
    }

    /**
     * getAccountBytes
     *
     * @param { ArgumentTypes.AccountId } account,
     */
    getAccountBytes(account: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getAccountBytes',
            [account],
            __options
        )
    }

    /**
     * getGitCommitId
     *
     */
    getGitCommitId(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getGitCommitId', [], __options)
    }
}
