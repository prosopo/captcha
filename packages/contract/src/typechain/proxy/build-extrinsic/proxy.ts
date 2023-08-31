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

import { buildSubmittableExtrinsic } from '@727-ventures/typechain-types'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue } from '@727-ventures/typechain-types'
import type BN from 'bn.js'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __apiPromise: ApiPromise

    constructor(nativeContract: ContractPromise, apiPromise: ApiPromise) {
        this.__nativeContract = nativeContract
        this.__apiPromise = apiPromise
    }
    /**
     * getAuthor
     *
     */
    getAuthor(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getAuthor', [], __options)
    }

    /**
     * getAdmin
     *
     */
    getAdmin(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getAdmin', [], __options)
    }

    /**
     * getProxyDestination
     *
     */
    getProxyDestination(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getProxyDestination', [], __options)
    }

    /**
     * proxyWithdraw
     *
     * @param { (string | number | BN) } amount,
     */
    proxyWithdraw(amount: string | number | BN, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'proxyWithdraw', [amount], __options)
    }

    /**
     * proxyTerminate
     *
     */
    proxyTerminate(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'proxyTerminate', [], __options)
    }

    /**
     * proxySetCodeHash
     *
     * @param { Array<(number | string | BN)> } codeHash,
     */
    proxySetCodeHash(codeHash: Array<number | string | BN>, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'proxySetCodeHash',
            [codeHash],
            __options
        )
    }

    /**
     * proxyForward
     *
     */
    proxyForward(__options: GasLimitAndRequiredValue) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'proxyForward', [], __options)
    }
}
