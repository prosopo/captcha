import { AbiMessage, ContractCallOutcome, DecodedEvent } from '@polkadot/api-contract/types';
import { AnyJson } from '@polkadot/types/types/codec';
import { Signer } from '../types/signer';
import { TransactionResponse } from '../types/contract';
/**
 * Get the event name from the contract method name
 * Each of the ink contract methods returns an event with a capitalised version of the method name
 * @return {string} event name
 */
export declare function getEventNameFromMethodName(contractMethodName: string): string;
/**
 * Extract events given the contract method name
 *
 * @return {AnyJson} array of events filtered by calculated event name
 */
export declare function getEventsFromMethodName(response: TransactionResponse, contractMethodName: string): AnyJson | DecodedEvent[] | any;
/** Encodes arguments that should be hashes using blake2AsU8a
 * @return encoded arguments
 */
export declare function encodeStringArgs<T>(methodObj: AbiMessage, args: T[]): T[];
/** Unwrap a query respons from a contract
 * @return {AnyJson} unwrapped
 */
export declare function unwrap(item: AnyJson): AnyJson;
/** Handle errors returned from contract queries by throwing them
 * @return {ContractCallOutcome} response
 */
export declare function handleContractCallOutcomeErrors<T>(response: ContractCallOutcome, contractMethodName: string, encodedArgs: T[]): ContractCallOutcome;
export declare function convertSignerToAddress(signer?: Signer | string): string;
//# sourceMappingURL=helpers.d.ts.map