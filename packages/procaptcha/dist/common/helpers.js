import { isHex, isU8a } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';
/** Encodes arguments that should be hashes using blake2AsU8a
 * @return encoded arguments
 */
export function encodeStringArgs(methodObj, args) {
    const encodedArgs = [];
    // args must be in the same order as methodObj['args']
    const typesToHash = ['Hash'];
    methodObj.args.forEach((methodArg, idx) => {
        const argVal = args[idx];
        // hash values that have been passed as strings
        if (typesToHash.indexOf(methodArg.type.type) > -1 && !(isU8a(argVal) || isHex(argVal))) {
            encodedArgs.push(blake2AsU8a(argVal));
        }
        else {
            encodedArgs.push(argVal);
        }
    });
    return encodedArgs;
}
/** Unwrap a query respons from a contract
 * @return {AnyJson} unwrapped
 */
export function unwrap(item) {
    const prop = 'Ok';
    if (item && typeof (item) === 'object') {
        if (prop in item) {
            return item[prop];
        }
    }
    return item;
}
//# sourceMappingURL=helpers.js.map