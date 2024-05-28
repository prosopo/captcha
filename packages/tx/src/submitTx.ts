import { TransactionQueue } from './txQueue.js'
import { IProsopoCaptchaContract } from '@prosopo/types'
import { BN } from '@polkadot/util'
import { KeyringPair } from '@polkadot/keyring/types'
import { getLogger, ProsopoContractError, LogLevel } from '@prosopo/common'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'

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
