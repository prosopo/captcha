// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { AbiMessage, ContractCallOutcome, ContractOptions, DecodedEvent } from '@polkadot/api-contract/types'
import { BN, BN_ONE, BN_ZERO, bnFromHex, isHex, isU8a, stringToHex } from '@polkadot/util'
import { AnyJson } from '@polkadot/types/types/codec'
import { ProsopoContractError } from '../handlers'
import { Abi } from '@polkadot/api-contract'
import { AccountId, DispatchError, EventRecord, StorageDeposit, WeightV2 } from '@polkadot/types/interfaces'
import { Bytes } from '@polkadot/types-codec'
import { Registry } from '@polkadot/types-codec/types/registry'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { Weight } from '@polkadot/types/interfaces/runtime/index'
import { ApiBase } from '@polkadot/api/types'

/**
 * Get the event name from the contract method name
 * Each of the ink contract methods returns an event with a capitalised version of the method name
 * @return {string} event name
 */
export function getEventNameFromMethodName(contractMethodName: string): string {
    return contractMethodName[0].toUpperCase() + contractMethodName.substring(1)
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
            argVal = stringToHexPadded(argVal)
        }
        encodedArgs.push(abi.registry.createType(methodArg.type.type, argVal).toU8a())
    })
    return encodedArgs
}

/** Handle errors returned from contract queries by throwing them
 */
export function handleContractCallOutcomeErrors(response: ContractCallOutcome, contractMethodName: string): void {
    const isOk = 'isOk'
    const asOk = 'asOk'
    if (response.output) {
        if (response.output[isOk]) {
            const responseOk = response.output[asOk]
            if (responseOk.isErr) {
                throw new ProsopoContractError(responseOk.toPrimitive().err.toString(), contractMethodName, {})
            }
        }
    }
}

/** Hash a string, padding with zeroes until its 32 bytes long
 * @return {string} string
 */
export function stringToHexPadded(data: string): string {
    const maxLength = 64
    if (data.length > maxLength) {
        throw new Error(`stringToHexPadded: string length ${data.length} exceeds ${maxLength}`)
    }

    const hexString = stringToHex(data).replace('0x', '')
    return `0x${Array(maxLength - hexString.length + 1).join('0')}${hexString}`
}

// TODO add test for this
export function decodeEvents(contractAddress: AccountId, records: EventRecord[], abi: Abi): DecodedEvent[] | undefined {
    return records
        .filter(
            ({ event }) =>
                function () {
                    console.log(event.toPrimitive())
                    return (
                        event.toPrimitive().section === 'contracts' &&
                        event.toPrimitive().data!['contract'] === contractAddress.toString()
                    )
                }
        )
        .map((record): DecodedEvent | null => {
            try {
                console.log(record.event.toHuman())
                // @ts-ignore
                console.log(record.event.index.toPrimitive())
                return abi.decodeEvent(record.event.data.toU8a() as Bytes)
            } catch (error) {
                console.log(error)
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
    return new ProsopoContractError(message)
}

// 4_999_999_999_999
const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE)

export function getOptions(
    api: ApiBase<'promise'>,
    isMutating?: boolean,
    value?: number | BN,
    gasLimit?: Weight | WeightV2,
    storageDeposit?: StorageDeposit
): ContractOptions {
    const _gasLimit: Weight | WeightV2 | undefined = gasLimit
        ? gasLimit
        : isMutating
        ? (api.registry.createType('WeightV2', {
              proofTime: new BN(1_000_000),
              refTime: MAX_CALL_WEIGHT,
          }) as WeightV2)
        : undefined
    return {
        gasLimit: _gasLimit,
        storageDepositLimit: storageDeposit
            ? storageDeposit.isCharge
                ? storageDeposit.asCharge
                : storageDeposit.isRefund
                ? storageDeposit.asRefund
                : null
            : null,
        value: value || BN_ZERO,
    }
}
