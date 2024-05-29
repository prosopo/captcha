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
import { Abi } from '@polkadot/api-contract/Abi'
import { AbiMessage, ContractCallOutcome, ContractOptions, DecodedEvent } from '@polkadot/api-contract/types'
import { AccountId, DispatchError, Event, EventRecord, StorageDeposit, WeightV2 } from '@polkadot/types/interfaces'
import { AnyJson } from '@polkadot/types/types/codec'
import { ApiBase } from '@polkadot/api/types'
import { BN, BN_ONE, BN_ZERO, bnFromHex } from '@polkadot/util/bn'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { Logger, ProsopoContractError, capitaliseFirstLetter } from '@prosopo/common'
import { Registry } from '@polkadot/types-codec/types/registry'
import { SubmittableResult } from '@polkadot/api/submittable'
import { isHex, isU8a } from '@polkadot/util/is'
import { stringToHex } from '@polkadot/util/string'

/**
 * Get the event name from the contract method name
 * Each of the ink contract methods returns an event with a capitalised version of the method name
 * @return {string} event name
 */
export function getEventNameFromMethodName(contractMethodName: string): string {
    return capitaliseFirstLetter(contractMethodName)
}

/**
 * Extract events given the contract method name
 *
 * @return {AnyJson} array of events filtered by calculated event name
 */
export function getEventsFromMethodName(
    response: ContractSubmittableResult,
    contractMethodName: string
): AnyJson | DecodedEvent[] | any {
    const eventName = getEventNameFromMethodName(contractMethodName)
    if (response && response.contractEvents) {
        return (
            response &&
            response.contractEvents &&
            response.contractEvents.filter((x) => x.event.identifier === eventName)
        )
    } else {
        return []
    }
}

/** Encodes arguments, padding and converting to hex if necessary
 * the ABI types
 * @return encoded arguments
 */
export function encodeStringArgs(abi: Abi, methodObj: AbiMessage, args: any[]): Uint8Array[] {
    const encodedArgs: Uint8Array[] = []
    // args must be in the same order as methodObj['args']
    const typesToHash = ['Hash']
    methodObj.args.forEach((methodArg, idx) => {
        let argVal = args[idx]
        // hash values that have been passed as strings
        if (typesToHash.indexOf(methodArg.type.type) > -1 && !(isU8a(argVal) || isHex(argVal))) {
            argVal = stringToHexPadded(argVal) // hashes must be 32 bytes long
        }
        encodedArgs.push(abi.registry.createType(methodArg.type.type, argVal).toU8a())
    })
    return encodedArgs
}

/** Get errors returned from contract queries
 */
export function getContractError(response: ContractCallOutcome): string | undefined {
    if (response.output) {
        const out: any = response.output
        if (out.isOk) {
            const responseOk = out.asOk
            if (responseOk.isErr) {
                return responseOk.toPrimitive().err.toString()
            }
        }
    }
    return 'Error: Failed to get contract error'
}

/** Hash a string, padding with zeroes until its 32 bytes long
 * @return {string} string
 */
export function stringToHexPadded(data: string): string {
    const maxLength = 64
    if (data.length > maxLength) {
        throw new ProsopoContractError('CONTRACT.INVALID_DATA_FORMAT', {
            context: { error: `stringToHexPadded: string length ${data.length} exceeds ${maxLength}` },
        })
    }

    const hexString = stringToHex(data).replace('0x', '')
    return `0x${Array(maxLength - hexString.length + 1).join('0')}${hexString}`
}

// TODO add test for this
export function decodeEvents(contractAddress: AccountId, records: EventRecord[], abi: Abi): DecodedEvent[] | undefined {
    return records
        .filter(({ event }) => {
            const data = event.toPrimitive().data
            if (data instanceof Array) {
                return false
            }
            if (!(data instanceof Object)) {
                return false
            }
            return event.toPrimitive().section === 'contracts' && data['contracts'] === contractAddress.toString()
        })
        .map((record): DecodedEvent | null => {
            try {
                return abi.decodeEvent(record)
            } catch (error) {
                console.error(error)
                return null
            }
        })
        .filter((decoded): decoded is DecodedEvent => !!decoded)
}

export function dispatchErrorHandler(registry: Registry, event: EventRecord): ProsopoContractError {
    const dispatchError = event.event.data[0] as DispatchError
    let message: string = dispatchError.type

    if (dispatchError.isModule) {
        try {
            const mod = dispatchError.asModule
            const error = registry.findMetaError(
                new Uint8Array([mod.index.toNumber(), bnFromHex(mod.error.toHex().slice(0, 4)).toNumber()])
            )
            message = `${error.section}.${error.name}${
                Array.isArray(error.docs) ? `(${error.docs.join('')})` : error.docs || ''
            }`
        } catch (error) {
            // swallow
        }
    }
    return new ProsopoContractError('CONTRACT.UNKNOWN_ERROR', { context: { error: message } })
}

// 4_999_999_999_999
const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE)

// The values returned by the dry run transactions are sometimes not large enough
// to guarantee that the transaction will succeed. This is a safety margin to ensure
// that the transaction will succeed.
export const GAS_INCREASE_FACTOR = 2

export function getOptions(
    api: ApiBase<'promise'>,
    isMutating?: boolean,
    value?: BN,
    gasLimit?: WeightV2,
    storageDeposit?: StorageDeposit,
    increaseGas?: boolean
): ContractOptions {
    const gasIncreaseFactor = increaseGas ? GAS_INCREASE_FACTOR : 1
    const _gasLimit: WeightV2 | undefined = gasLimit
        ? api.registry.createType('WeightV2', {
              refTime: gasLimit.refTime.toBn().muln(gasIncreaseFactor),
              proofSize: gasLimit.proofSize.toBn().muln(gasIncreaseFactor),
          })
        : isMutating
        ? (api.registry.createType('WeightV2', {
              proofSize: new BN(1_000_000),
              refTime: MAX_CALL_WEIGHT,
          }) as WeightV2)
        : undefined
    return {
        gasLimit: _gasLimit,
        storageDepositLimit: storageDeposit
            ? storageDeposit.isCharge && storageDeposit.asCharge.gt(BN_ZERO)
                ? storageDeposit.asCharge.toBn().muln(gasIncreaseFactor)
                : storageDeposit.isRefund
                ? storageDeposit.asRefund && storageDeposit.asRefund.gt(BN_ZERO)
                    ? storageDeposit.asRefund.toBn().muln(gasIncreaseFactor)
                    : null
                : null
            : null,
        value: value ? value.toString() : BN_ZERO,
    } as ContractOptions
}

export function filterAndDecodeContractEvents(result: SubmittableResult, abi: Abi, logger: Logger): DecodedEvent[] {
    return result.events
        .filter(
            (e) =>
                e.event.section === 'contracts' && ['ContractEmitted', 'ContractExecution'].indexOf(e.event.method) > -1
        )
        .map((eventRecord): DecodedEvent | null => {
            const {
                event: {
                    data: [, data],
                },
            } = eventRecord
            try {
                return abi.decodeEvent(eventRecord)
            } catch (error) {
                logger.error(`Unable to decode contract event: ${(error as Error).message}`)
                logger.error(eventRecord.event.toHuman())

                return null
            }
        })
        .filter((decoded): decoded is DecodedEvent => !!decoded)
}

export function formatEvent(event: Event): string {
    return `${event.section}.${event.method}${
        'docs' in event ? (Array.isArray(event.docs) ? `(${event.docs.join('')})` : event.docs || '') : ''
    }`
}
