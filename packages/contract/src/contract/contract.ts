// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import { SubmittableResult } from '@polkadot/api'
import { Abi, ContractPromise } from '@polkadot/api-contract'
import type { AbiMessage, ContractCallOutcome } from '@polkadot/api-contract/types'
import { createTypeUnsafe } from '@polkadot/types'
import type { AccountId, ContractExecResult, EventRecord, Weight } from '@polkadot/types/interfaces'
import { isU8a, stringCamelCase, stringUpperFirst, u8aToHex } from '@polkadot/util'
import { addressEq } from '@polkadot/util-crypto'
import BN from 'bn.js'
import { buildTx } from './buildTx'
import { AnyString } from '@polkadot/util/types'
import {
    CallOverrides,
    CallParams,
    ContractFunction,
    DecodedEvent,
    PopulatedTransaction,
    TransactionParams,
    TransactionResponse,
} from '../types/contract'
import { logger } from '../logger'
import { ProsopoContractError } from '../handlers'
import { KeyringPair } from '@polkadot/keyring/types'

export async function populateTransaction(
    contract: ContractPromise,
    fragment: AbiMessage,
    args: TransactionParams
): Promise<PopulatedTransaction> {
    let overrides: Partial<CallOverrides> = {}

    if (overrides.signer) {
        throw new ProsopoContractError('CONTRACT.SIGNER_NOT_SUPPORTED')
    }

    if (args.length === fragment.args.length + 1 && typeof args[args.length - 1] === 'object') {
        overrides = { ...(args.pop() as Partial<CallOverrides>) }
    }

    // The ABI coded transaction
    const data = fragment.toU8a(args as unknown[])

    const maximumBlockWeight = contract.api.consts.system.blockWeights
        ? (
              contract.api.consts.system.blockWeights as unknown as {
                  maxBlock: Weight
              }
          ).maxBlock
        : (contract.api.consts.system.maximumBlockWeight as Weight)

    const callParams: CallParams = {
        dest: overrides.dest || contract.address,
        value: overrides.value || new BN('0'),
        gasLimit: overrides.gasLimit || maximumBlockWeight.muln(2).divn(10),
        inputData: data,
    }

    // Remove the overrides
    delete overrides.dest
    delete overrides.value
    delete overrides.gasLimit

    const hasStorageDeposit = contract.api.tx.contracts.call.meta.args.length === 5
    const storageDepositLimit = null
    const extrinsic = hasStorageDeposit
        ? contract.api.tx.contracts.call(
              callParams.dest,
              callParams.value,
              callParams.gasLimit,
              storageDepositLimit,
              callParams.inputData
          )
        : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore old style without storage deposit
          contract.api.tx.contracts.call(callParams.dest, callParams.value, callParams.gasLimit, callParams.inputData)

    return {
        ...overrides,
        callParams,
        extrinsic,
    }
}

function decodeEvents(contractAddress: any, records: SubmittableResult, abi: Abi): DecodedEvent[] | undefined {
    let events: EventRecord[]

    events = records.filterRecords('contracts', ['ContractEmitted', 'ContractExecution'])

    events = events.filter((event) => {
        const accountId = event.event.data[0] as AccountId
        return addressEq(accountId, contractAddress)
    })

    if (!events.length) {
        return undefined
    }

    return events.map((event) => {
        const decoded = abi.decodeEvent(event.event.data[1] as any) as Partial<DecodedEvent>
        decoded.name = stringUpperFirst(stringCamelCase(<AnyString>decoded.event?.identifier))
        return decoded as DecodedEvent
    })
}

export function buildCall(
    contract: ContractPromise,
    fragment: AbiMessage,
    pair: KeyringPair,
    isEstimateGas = false,
    at?: string | Uint8Array
): ContractFunction<ContractCallOutcome> {
    return async function (...args: TransactionParams): Promise<ContractCallOutcome> {
        const { extrinsic, callParams } = await populateTransaction(contract, fragment, args)
        const messageName = stringCamelCase(fragment.identifier)

        const origin = pair.address

        const params = {
            ...callParams,
            origin,
        }

        logger.debug('')

        if (!isEstimateGas) {
            logger.debug(`===== Read ${messageName} =====`)
        } else {
            logger.debug(`===== Estimate gas ${messageName} =====`)
        }
        for (const key in params) {
            try {
                let print: string
                if (isU8a(!params || params[key])) {
                    if (params) {
                        print = u8aToHex(params[key])
                        logger.debug(`${key}: `, print)
                    }
                } else {
                    if (params) {
                        print = params[key].toString()
                        logger.debug(`${key}: `, print)
                    }
                }
            } catch (err) {
                throw new ProsopoContractError(err)
            }
        }

        const hasStorageDeposit = contract.api.tx.contracts.call.meta.args.length === 5
        const storageDepositLimit = null
        const rpcParams = hasStorageDeposit
            ? {
                  ...callParams,
                  storageDepositLimit,
                  origin,
              }
            : {
                  ...callParams,
                  origin,
              }

        const _contractCallFn = contract.api.rpc.contracts.call

        const json: any = await (at ? _contractCallFn(rpcParams, at) : _contractCallFn(rpcParams))

        const { debugMessage, gasRequired, gasConsumed, result, storageDeposit } = json

        const outcome = {
            debugMessage,
            gasConsumed,
            gasRequired: gasRequired && !gasRequired.isZero ? gasRequired : gasConsumed,
            output:
                result.isOk && fragment.returnType
                    ? createTypeUnsafe(
                          contract.api.registry,
                          fragment.returnType.type,
                          [result.asOk.data.toU8a(true)],
                          { isPedantic: true }
                      )
                    : null,
            result,
            storageDeposit: storageDeposit,
        }

        if (result.isOk) {
            if (!isEstimateGas) {
                logger.debug(`Output: ${(outcome.output as any)?.toString()}`)
            } else {
                logger.debug(`Output: ${outcome.gasConsumed.toString()}`)
            }
        } else {
            logger.error(
                `output: ${(outcome.output as any)?.toString()}; debugMessage: ${outcome.debugMessage.toString()}`
            )
        }

        return outcome
    }
}

export function buildSend(
    contract: ContractPromise,
    fragment: AbiMessage,
    pair: KeyringPair
): ContractFunction<TransactionResponse> {
    return async function (...args: TransactionParams): Promise<TransactionResponse> {
        const { extrinsic, callParams, ...options } = await populateTransaction(contract, fragment, args)
        const messageName = stringCamelCase(fragment.identifier)

        logger.debug('')
        logger.debug(`===== Exec ${messageName} =====`)
        Object.keys(callParams).forEach((key) => {
            try {
                let print: string
                if (isU8a(!callParams || callParams[key])) {
                    if (callParams) {
                        print = u8aToHex(callParams[key])
                        logger.debug(`${key}: `, print)
                    }
                } else {
                    if (callParams) {
                        print = callParams[key].toString()
                        logger.debug(`${key}: `, print)
                    }
                }
            } catch (err) {
                throw new ProsopoContractError(err)
            }
        })

        const response = await buildTx(contract.api.registry, extrinsic, pair, {
            ...options,
        }).catch((error) => {
            throw error.error || error
        })

        if ('result' in response && 'events' in response.result) {
            response.events = decodeEvents(callParams.dest, response.result, contract.abi)
        }

        if (response && !response.error) {
            logger.debug(`Execute successfully`)
        } else {
            logger.debug(`Execute failed. ${response.error?.message || ''}`)
        }

        return response
    }
}

function buildEstimate(contract: ContractPromise, fragment: AbiMessage, pair: KeyringPair): ContractFunction<BN> {
    return async function (...args: TransactionParams): Promise<BN> {
        const call = buildCall(contract, fragment, pair, true)
        const callResult = await call(...args)

        if (callResult.result.isErr) {
            return new BN('0')
        } else {
            return new BN(callResult.gasConsumed)
        }
    }
}
