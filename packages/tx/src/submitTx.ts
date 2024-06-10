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
import { BN } from '@polkadot/util'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { IProsopoCaptchaContract } from '@prosopo/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, ProsopoContractError, getLogger } from '@prosopo/common'
import { TransactionQueue } from './txQueue.js'

const log = getLogger(LogLevel.enum.info, 'submitTx')

export async function submitTx(
    transactionQueue: TransactionQueue,
    contract: IProsopoCaptchaContract,
    method: string,
    args: any[],
    value: BN,
    pair?: KeyringPair
): Promise<ContractSubmittableResult> {
    return new Promise((resolve, reject) => {
        if (
            contract.nativeContract.tx &&
            method in contract.nativeContract.tx &&
            contract.nativeContract.tx[method] !== undefined
        ) {
            try {
                contract.dryRunContractMethod(method, args, value).then((extrinsic) => {
                    transactionQueue
                        .add(
                            extrinsic,
                            (result: ContractSubmittableResult) => {
                                resolve(result)
                            },
                            pair,
                            method
                        )
                        .then((result) => {
                            log.debug('Transaction added to queue', result)
                        })
                })
            } catch (err) {
                reject(err)
            }
        } else {
            reject(new ProsopoContractError('CONTRACT.INVALID_METHOD', { context: { failedFuncName: submitTx.name } }))
        }
    })
}
