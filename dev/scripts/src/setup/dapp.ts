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
import { Dapp, DappPayee } from '@prosopo/captcha-contract'
import { IDappAccount } from '@prosopo/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel } from '@prosopo/common'
import { ProsopoCaptchaContract, TransactionQueue, oneUnit, wrapQuery } from '@prosopo/contract'
import { ProsopoContractError, getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { sendFunds } from './funds.js'

const log = getLogger(LogLevel.enum.info, 'setupDapp')

async function submitTx(
    transactionQueue: TransactionQueue,
    contract: ProsopoCaptchaContract,
    method: string,
    args: any[],
    value: number | BN,
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
            reject(new ProsopoContractError('CONTRACT.INVALID_METHOD'))
        }
    })
}

export async function setupDapp(
    env: ProviderEnvironment,
    dapp: IDappAccount,
    address?: string,
    queue?: TransactionQueue
): Promise<void> {
    const logger = env.logger

    if (dapp.pair) {
        const addressToRegister = address || dapp.pair.address
        await env.changeSigner(dapp.pair)
        const tasks = new Tasks(env)
        await dappSendFunds(env, dapp)
        try {
            const dappResult: Dapp = await wrapQuery(
                tasks.contract.query.getDapp,
                tasks.contract.query
            )(addressToRegister)
            logger.info('   - dapp is already registered')
            logger.info('Dapp', dappResult)
            if (dappResult.status === 'Inactive') {
                await wrapQuery(tasks.contract.query.dappFund, tasks.contract.query)(addressToRegister, {
                    value: dapp.fundAmount,
                })

                logger.info('   - dappFund')

                if (queue) {
                    await submitTx(queue, tasks.contract, 'dappFund', [addressToRegister], dapp.fundAmount)
                } else {
                    await tasks.contract.tx.dappFund(addressToRegister, { value: dapp.fundAmount })
                }
            }
        } catch (e) {
            logger.info('   - dappRegister', addressToRegister)

            await wrapQuery(tasks.contract.query.dappRegister, tasks.contract.query)(addressToRegister, DappPayee.dapp)
            if (queue) {
                await submitTx(queue, tasks.contract, 'dappRegister', [addressToRegister, DappPayee.dapp], 0)
            } else {
                await tasks.contract.tx.dappRegister(addressToRegister, DappPayee.dapp)
            }

            await wrapQuery(tasks.contract.query.dappFund, tasks.contract.query)(addressToRegister, {
                value: dapp.fundAmount,
            })

            logger.info('   - dappFund')

            if (queue) {
                await submitTx(queue, tasks.contract, 'dappFund', [addressToRegister], dapp.fundAmount)
            } else {
                await tasks.contract.tx.dappFund(addressToRegister, { value: dapp.fundAmount })
            }
        }
    }
}

async function dappSendFunds(env: ProviderEnvironment, dapp: IDappAccount) {
    if (dapp.pair && !dapp.pair.isLocked) {
        const sendAmount = oneUnit(env.getApi())
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const {
            data: { free: previousFree },
        } = await env.getContractInterface().api.query.system.account(dapp.pair.address)
        if (previousFree.lt(new BN(sendAmount.toString()))) {
            // send enough funds to cover the tx fees
            await sendFunds(env, dapp.pair.address, 'Dapp', sendAmount)
        }
    }
}
