import { AnyNumber } from '@polkadot/types-codec/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { Index } from '@polkadot/types/interfaces'
import { BN } from '@polkadot/util'
import { ISubmittableResult } from '@polkadot/types/types'
import { getLogger, LogLevel } from '@prosopo/common'
import { ApiPromise } from '@polkadot/api'
import { getBalance, oneUnit } from './balances/index.js'
import { getDispatchError } from './getDispatchError.js'

const log = getLogger(LogLevel.enum.info, 'tx.sendFunds')

export const send = async (
    api: ApiPromise,
    toAddress: string,
    amount: AnyNumber,
    fromPair: KeyringPair,
    nonce?: Index
) => {
    if (!nonce) {
        nonce = await api.rpc.system.accountNextIndex(fromPair.address)
    }
    await api.isReady
    const unit = oneUnit(api)
    const unitAmount = new BN(amount.toString()).div(unit).toString()
    const balance = await getBalance(api, fromPair.address)
    log.debug(
        'Sending funds from',
        fromPair.address,
        'to',
        toAddress,
        'Amount:',
        unitAmount,
        'UNIT. Free balance:',
        balance.div(unit).toString(),
        'UNIT'
    )
    return new Promise<ISubmittableResult>(async (resolve, reject) => {
        const unsub = await api.tx.balances
            .transferAllowDeath(toAddress, amount)
            .signAndSend(fromPair, { nonce }, (result: ISubmittableResult) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    result.events
                        .filter(({ event: { section } }: any): boolean => section === 'system')
                        .forEach((event): void => {
                            const {
                                event: { method },
                            } = event

                            if (method === 'ExtrinsicFailed') {
                                unsub()
                                reject(event)
                            }
                        })
                    unsub()
                    resolve(result)
                } else if (result.isError) {
                    unsub()
                    reject(result)
                } else if (result.dispatchError) {
                    reject(getDispatchError(result.dispatchError))
                }
            })
    })
}
