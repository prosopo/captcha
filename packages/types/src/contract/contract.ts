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

import { DecodedEvent } from '@polkadot/api-contract/types'
import { SubmittableResult } from '@polkadot/api/submittable'

export interface TransactionResponse {
    from: string
    txHash?: string
    blockHash?: string
    error?: {
        message?: any
        data?: any
    }
    result: SubmittableResult
    events?: DecodedEvent[]
}
