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
import { AbiMessage, ContractCallOutcome } from '@polkadot/api-contract/types'
import { bnFromHex, isHex, isU8a, stringCamelCase, stringToHex, stringUpperFirst } from '@polkadot/util'
import { AnyJson } from '@polkadot/types/types/codec'
import { DecodedEvent, TransactionResponse } from '../types/contract'
import { ProsopoContractError } from '../handlers'
import { SubmittableResult } from '@polkadot/api'
import { Abi } from '@polkadot/api-contract'
import { AccountId, DispatchError, EventRecord } from '@polkadot/types/interfaces'
import { addressEq } from '@polkadot/util-crypto'
import { Bytes } from '@polkadot/types-codec'
import { AnyString } from '@polkadot/util/types'
import { Registry } from '@polkadot/types-codec/types/registry'

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
    response: TransactionResponse,
    contractMethodName: string
): AnyJson | DecodedEvent[] | any {
    const eventName = getEventNameFromMethodName(contractMethodName)
    if (response && response['events']) {
        return response && response['events'] && response['events'].filter((x) => x.name === eventName)
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

export function decodeEvents(
    contractAddress: AccountId,
    records: SubmittableResult,
    abi: Abi
): DecodedEvent[] | undefined {
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
        const decoded = abi.decodeEvent(event.event.data[1] as Bytes) as Partial<DecodedEvent>
        decoded.name = stringUpperFirst(stringCamelCase(<AnyString>decoded.event?.identifier))
        return decoded as DecodedEvent
    })
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
