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
import {AbiMessage, ContractCallOutcome, DecodedEvent} from '@polkadot/api-contract/types'
import {isHex, isU8a, stringToHex} from '@polkadot/util'
import {AnyJson} from '@polkadot/types/types/codec'
import {Signer} from '../types/signer'
import {TransactionResponse} from '../types/contract'
import {ProsopoContractError} from "../handlers";
import {AnyString} from "@polkadot/util/types";

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
export function getEventsFromMethodName(response: TransactionResponse, contractMethodName: string): AnyJson | DecodedEvent[] | any {
    const eventName = getEventNameFromMethodName(contractMethodName)
    if (response && response['events'] ) {
        return response && response['events'] && response["events"].filter((x) => x.name === eventName)
    } else {
        return []
    }

}


/** Encodes arguments that should be hashes using blake2AsU8a
 * @return encoded arguments
 */
export function encodeStringArgs<T>(methodObj: AbiMessage, args: T[]): T[] {
    const encodedArgs: T[] = []
    // args must be in the same order as methodObj['args']
    const typesToHash = ['Hash']
    methodObj.args.forEach((methodArg, idx) => {
        const argVal = args[idx]
        // hash values that have been passed as strings
        if (typesToHash.indexOf(methodArg.type.type) > -1 && !(isU8a(argVal) || isHex(argVal))) {
            encodedArgs.push(stringToHexPadded(argVal as unknown as string) as unknown as T)
        } else {
            encodedArgs.push(argVal)
        }
    })
    return encodedArgs
}

/** Unwrap a query respons from a contract
 * @return {AnyJson} unwrapped
 */
export function unwrap(item: AnyJson): AnyJson {
    const prop = 'Ok'
    if (item && typeof (item) === 'object') {
        if (prop in item) {
            return item[prop]
        }
    }
    return item
}

/** Handle errors returned from contract queries by throwing them
 * @return {ContractCallOutcome} response
 */
export function handleContractCallOutcomeErrors<T>(response: ContractCallOutcome, contractMethodName: string, encodedArgs: T[]): ContractCallOutcome {
    const errorKey = 'Err'
    if (response.output) {
        const humanOutput = response.output?.toHuman()
        if (humanOutput && typeof (humanOutput) === 'object' && errorKey in humanOutput) {
            throw new ProsopoContractError(humanOutput[errorKey] as string, contractMethodName, {}, encodedArgs)
        }
    }
    return response
}


export function convertSignerToAddress(signer?: Signer | string): string {
    if (!signer) return '';
    return typeof signer !== 'string' ? signer.address : signer;
}

/** Hash a string, padding with zeroes until its 32 bytes long
 * @return {string} string
 */
export function stringToHexPadded(data: string): string {
    const maxLength = 64
    if (data.length > maxLength) {
        throw new Error(`stringToHexPadded: string length ${data.length} exceeds ${maxLength}`)
    }

    const hexString = stringToHex(data).replace("0x", "");
    return `0x${Array(maxLength - hexString.length + 1).join("0")}${hexString}`
}
