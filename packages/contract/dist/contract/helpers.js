"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertSignerToAddress = exports.handleContractCallOutcomeErrors = exports.unwrap = exports.encodeStringArgs = exports.getEventsFromMethodName = exports.getEventNameFromMethodName = void 0;
const util_1 = require("@polkadot/util");
const util_crypto_1 = require("@polkadot/util-crypto");
const handlers_1 = require("../handlers");
/**
 * Get the event name from the contract method name
 * Each of the ink contract methods returns an event with a capitalised version of the method name
 * @return {string} event name
 */
function getEventNameFromMethodName(contractMethodName) {
    return contractMethodName[0].toUpperCase() + contractMethodName.substring(1);
}
exports.getEventNameFromMethodName = getEventNameFromMethodName;
/**
 * Extract events given the contract method name
 *
 * @return {AnyJson} array of events filtered by calculated event name
 */
function getEventsFromMethodName(response, contractMethodName) {
    const eventName = getEventNameFromMethodName(contractMethodName);
    if (response && response['events']) {
        return response && response['events'] && response["events"].filter((x) => x.name === eventName);
    }
    else {
        return [];
    }
}
exports.getEventsFromMethodName = getEventsFromMethodName;
/** Encodes arguments that should be hashes using blake2AsU8a
 * @return encoded arguments
 */
function encodeStringArgs(methodObj, args) {
    const encodedArgs = [];
    // args must be in the same order as methodObj['args']
    const typesToHash = ['Hash'];
    methodObj.args.forEach((methodArg, idx) => {
        const argVal = args[idx];
        // hash values that have been passed as strings
        if (typesToHash.indexOf(methodArg.type.type) > -1 && !((0, util_1.isU8a)(argVal) || (0, util_1.isHex)(argVal))) {
            encodedArgs.push((0, util_crypto_1.blake2AsU8a)(argVal));
        }
        else {
            encodedArgs.push(argVal);
        }
    });
    return encodedArgs;
}
exports.encodeStringArgs = encodeStringArgs;
/** Unwrap a query respons from a contract
 * @return {AnyJson} unwrapped
 */
function unwrap(item) {
    const prop = 'Ok';
    if (item && typeof (item) === 'object') {
        if (prop in item) {
            return item[prop];
        }
    }
    return item;
}
exports.unwrap = unwrap;
/** Handle errors returned from contract queries by throwing them
 * @return {ContractCallOutcome} response
 */
function handleContractCallOutcomeErrors(response, contractMethodName, encodedArgs) {
    var _a;
    const errorKey = 'Err';
    if (response.output) {
        const humanOutput = (_a = response.output) === null || _a === void 0 ? void 0 : _a.toHuman();
        if (humanOutput && typeof (humanOutput) === 'object' && errorKey in humanOutput) {
            throw new handlers_1.ProsopoContractError(humanOutput[errorKey], contractMethodName, encodedArgs);
        }
    }
    return response;
}
exports.handleContractCallOutcomeErrors = handleContractCallOutcomeErrors;
function convertSignerToAddress(signer) {
    if (!signer)
        return '';
    return typeof signer !== 'string' ? signer.address : signer;
}
exports.convertSignerToAddress = convertSignerToAddress;
//# sourceMappingURL=helpers.js.map