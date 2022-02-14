import { AbiMessage, ContractCallOutcome } from '@polkadot/api-contract/types';
import { AnyJson } from '@polkadot/types/types/codec';
/**
 * Get the event name from the contract method name
 * Each of the ink contract methods returns an event with a capitalised version of the method name
 * @return {string} event name
 */
export declare function getEventNameFromMethodName(contractMethodName: string): string;
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
export declare function handleContractCallOutcomeErrors(response: ContractCallOutcome): ContractCallOutcome;
