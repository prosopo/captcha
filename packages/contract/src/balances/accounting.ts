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
import type { ApiPromise } from '@polkadot/api/promise/Api'
import { BN } from '@polkadot/util/bn'
import { ProsopoApiError } from '@prosopo/common'

export function oneUnit(api: ApiPromise): BN {
    if (api.registry.chainDecimals[0] === undefined) {
        throw new ProsopoApiError('CONTRACT.CHAIN_DECIMALS_UNDEFINED')
    }
    const chainDecimals = new BN(api.registry.chainDecimals[0])
    return new BN((10 ** chainDecimals.toNumber()).toString())
}
