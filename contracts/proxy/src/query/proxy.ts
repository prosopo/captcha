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

import { handleReturnType, queryOkJSON } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/proxy.js'
import type * as ReturnTypes from '../types-returns/proxy.js'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@prosopo/typechain-types'
import type { QueryReturnType } from '@prosopo/typechain-types'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getTypeDescription } from './../shared/utils.js'
import DATA_TYPE_DESCRIPTIONS from '../data/proxy.json' assert { type: 'json' }

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __apiPromise: ApiPromise
    readonly __callerAddress: string

    constructor(nativeContract: ContractPromise, nativeApi: ApiPromise, callerAddress: string) {
        this.__nativeContract = nativeContract
        this.__callerAddress = callerAddress
        this.__apiPromise = nativeApi
    }

    /**
     * forward
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    forward(__options?: GasLimitAndRequiredValue): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'forward',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(6, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * handler
     *
     * @param { ArgumentTypes.ProxyMessages } msg,
     * @returns { Result<Result<ReturnTypes.ProxyReturnTypes, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    handler(
        msg: ArgumentTypes.ProxyMessages,
        __options?: GasLimit
    ): Promise<
        QueryReturnType<Result<Result<ReturnTypes.ProxyReturnTypes, ReturnTypes.Error>, ReturnTypes.LangError>>
    > {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'handler',
            [msg],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(12, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }
}
