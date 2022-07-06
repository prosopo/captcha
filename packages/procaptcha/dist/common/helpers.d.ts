import { AbiMessage } from '@polkadot/api-contract/types';
import { AnyJson } from '@polkadot/types/types/codec';
/** Encodes arguments that should be hashes using blake2AsU8a
 * @return encoded arguments
 */
export declare function encodeStringArgs<T>(methodObj: AbiMessage, args: T[]): T[];
/** Unwrap a query respons from a contract
 * @return {AnyJson} unwrapped
 */
export declare function unwrap(item: AnyJson): AnyJson;
//# sourceMappingURL=helpers.d.ts.map