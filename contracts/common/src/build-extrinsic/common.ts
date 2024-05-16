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
