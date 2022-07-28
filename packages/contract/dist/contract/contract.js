"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contract = exports.buildCall = void 0;
const tslib_1 = require("tslib");
const api_contract_1 = require("@polkadot/api-contract");
const types_1 = require("@polkadot/types");
const util_1 = require("@polkadot/util");
const util_crypto_1 = require("@polkadot/util-crypto");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
// import chalk from 'chalk';
const buildTx_1 = require("./buildTx");
const helpers_1 = require("./helpers");
const logger_1 = require("../logger");
function populateTransaction(contract, fragment, args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let overrides = {};
        if (overrides.signer) {
            throw new Error('Signer is not supported. Use connect instead, e.g. contract.connect(signer)');
        }
        if (args.length === fragment.args.length + 1 &&
            typeof args[args.length - 1] === 'object') {
            overrides = Object.assign({}, args.pop());
        }
        // The ABI coded transaction
        const data = fragment.toU8a(args);
        const maximumBlockWeight = contract.api.consts.system.blockWeights
            ? contract.api.consts.system.blockWeights.maxBlock
            : contract.api.consts.system.maximumBlockWeight;
        const callParams = {
            dest: overrides.dest || contract.address,
            value: overrides.value || new bn_js_1.default('0'),
            gasLimit: overrides.gasLimit ||
                contract.gasLimit ||
                maximumBlockWeight.muln(2).divn(10),
            inputData: data
        };
        // Remove the overrides
        delete overrides.dest;
        delete overrides.value;
        delete overrides.gasLimit;
        const hasStorageDeposit = contract.api.tx.contracts.call.meta.args.length === 5;
        const storageDepositLimit = null;
        const extrinsic = hasStorageDeposit
            ? contract.api.tx.contracts.call(callParams.dest, callParams.value, callParams.gasLimit, storageDepositLimit, 
            //@ts-ignore
            callParams.inputData)
            : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore old style without storage deposit
                contract.api.tx.contracts.call(callParams.dest, callParams.value, callParams.gasLimit, callParams.inputData);
        return Object.assign(Object.assign({}, overrides), { callParams,
            extrinsic });
    });
}
function buildPopulate(contract, fragment) {
    return function (...args) {
        return populateTransaction(contract, fragment, args);
    };
}
function decodeEvents(contractAddress, records, abi) {
    let events;
    events = records.filterRecords('contracts', [
        'ContractEmitted',
        'ContractExecution'
    ]);
    events = events.filter((event) => {
        const accountId = event.event.data[0];
        return (0, util_crypto_1.addressEq)(accountId, contractAddress);
    });
    if (!events.length) {
        return undefined;
    }
    return events.map((event) => {
        var _a;
        const decoded = abi.decodeEvent(event.event.data[1]);
        decoded.name = (0, util_1.stringUpperFirst)((0, util_1.stringCamelCase)((_a = decoded.event) === null || _a === void 0 ? void 0 : _a.identifier));
        return decoded;
    });
}
function buildCall(contract, fragment, isEstimateGas = false, at) {
    return function (...args) {
        var _a, _b;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { extrinsic, callParams } = yield populateTransaction(contract, fragment, args);
            const messageName = (0, util_1.stringCamelCase)(fragment.identifier);
            const origin = contract.signer;
            const params = Object.assign(Object.assign({}, callParams), { origin });
            logger_1.logger.debug('');
            if (!isEstimateGas) {
                logger_1.logger.debug(`===== Read ${messageName} =====`);
            }
            else {
                logger_1.logger.debug(`===== Estimate gas ${messageName} =====`);
            }
            Object.keys(params).forEach((key) => {
                try {
                    let print;
                    if ((0, util_1.isU8a)(!(callParams) || callParams[key])) {
                        if (callParams) {
                            print = (0, util_1.u8aToHex)(callParams[key]);
                            logger_1.logger.debug(`${key}: `, print);
                        }
                    }
                    else {
                        if (callParams) {
                            print = callParams[key].toString();
                            logger_1.logger.debug(`${key}: `, print);
                        }
                    }
                }
                catch (_a) {
                }
            });
            const hasStorageDeposit = contract.api.tx.contracts.call.meta.args.length === 5;
            const storageDepositLimit = null;
            const rpcParams = hasStorageDeposit
                ? Object.assign(Object.assign({}, callParams), { storageDepositLimit,
                    origin }) : Object.assign(Object.assign({}, callParams), { origin });
            const _contractCallFn = contract.api.rpc.contracts.call;
            const json = yield (at ? _contractCallFn(rpcParams, at) : _contractCallFn(rpcParams));
            const { debugMessage, gasRequired, gasConsumed, result, storageDeposit } = json;
            const outcome = {
                debugMessage,
                gasConsumed,
                gasRequired: gasRequired && !gasRequired.isZero ? gasRequired : gasConsumed,
                output: result.isOk && fragment.returnType
                    ? (0, types_1.createTypeUnsafe)(contract.api.registry, fragment.returnType.type, [result.asOk.data.toU8a(true)], { isPedantic: true })
                    : null,
                result,
                storageDeposit: storageDeposit
            };
            if (result.isOk) {
                if (!isEstimateGas) {
                    logger_1.logger.debug(`Output: ${(_a = outcome.output) === null || _a === void 0 ? void 0 : _a.toString()}`);
                }
                else {
                    logger_1.logger.debug(`Output: ${outcome.gasConsumed.toString()}`);
                }
            }
            else {
                logger_1.logger.error(`output: ${(_b = outcome.output) === null || _b === void 0 ? void 0 : _b.toString()}; debugMessage: ${outcome.debugMessage.toString()}`);
            }
            return outcome;
        });
    };
}
exports.buildCall = buildCall;
function buildDefault(contract, fragment) {
    if (!fragment.isMutating) {
        return buildCall(contract, fragment);
    }
    return buildSend(contract, fragment);
}
function buildSend(contract, fragment) {
    return function (...args) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const _b = yield populateTransaction(contract, fragment, args), { extrinsic, callParams } = _b, options = tslib_1.__rest(_b, ["extrinsic", "callParams"]);
            const messageName = (0, util_1.stringCamelCase)(fragment.identifier);
            logger_1.logger.debug('');
            logger_1.logger.debug(`===== Exec ${messageName} =====`);
            Object.keys(callParams).forEach((key) => {
                try {
                    let print;
                    if ((0, util_1.isU8a)(!(callParams) || callParams[key])) {
                        if (callParams) {
                            print = (0, util_1.u8aToHex)(callParams[key]);
                            logger_1.logger.debug(`${key}: `, print);
                        }
                    }
                    else {
                        if (callParams) {
                            print = callParams[key].toString();
                            logger_1.logger.debug(`${key}: `, print);
                        }
                    }
                }
                catch (_a) {
                }
            });
            const response = yield (0, buildTx_1.buildTx)(contract.api.registry, extrinsic, contract.signer, Object.assign({}, options)).catch((error) => {
                throw error.error || error;
            });
            if ("result" in response && "events" in response.result) {
                response.events = decodeEvents(callParams.dest, response.result, contract.abi);
            }
            if (response && !response.error) {
                logger_1.logger.debug(`Execute successfully`);
            }
            else {
                logger_1.logger.debug(`Execute failed. ${((_a = response.error) === null || _a === void 0 ? void 0 : _a.message) || ''}`);
            }
            return response;
        });
    };
}
function buildEstimate(contract, fragment) {
    return function (...args) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const call = buildCall(contract, fragment, true);
            const callResult = yield call(...args);
            if (callResult.result.isErr) {
                return new bn_js_1.default('0');
            }
            else {
                return new bn_js_1.default(callResult.gasConsumed);
            }
        });
    };
}
class Contract {
    constructor(address, contractAbi, apiProvider, signer) {
        this.address = apiProvider.registry.createType('AccountId', address);
        this.abi =
            contractAbi instanceof api_contract_1.Abi
                ? contractAbi
                : new api_contract_1.Abi(contractAbi, apiProvider.registry.getChainProperties());
        this.api = apiProvider;
        this.signer = (0, helpers_1.convertSignerToAddress)(signer);
        this.query = {};
        this.tx = {};
        this.estimateGas = {};
        this.functions = {};
        this.populateTransaction = {};
        this.address = this.api.registry.createType('AccountId', address);
        for (const fragment of this.abi.messages) {
            const messageName = (0, util_1.stringCamelCase)(fragment.identifier);
            if (this[messageName] == null) {
                Object.defineProperty(this, messageName, {
                    enumerable: true,
                    value: buildDefault(this, fragment),
                    writable: false
                });
            }
            if (this.query[messageName] == null) {
                this.query[messageName] = buildCall(this, fragment);
            }
            if (this.tx[messageName] == null) {
                this.tx[messageName] = buildSend(this, fragment);
            }
            if (this.populateTransaction[messageName] == null) {
                this.populateTransaction[messageName] = buildPopulate(this, fragment);
            }
            if (this.estimateGas[messageName] == null) {
                this.estimateGas[messageName] = buildEstimate(this, fragment);
            }
        }
    }
    /**
     * Query at specific block
     *
     * @param at string | Uint8Array
     * @param abi AbiMessage
     * @returns ContractFunction\<ContractCallOutcome\>
     */
    queryAt(at, abi) {
        return buildCall(this, abi, false, at);
    }
    /**
     * Change contract signer
     *
     * @param signer Signer
     * @returns Contract
     */
    connect(signer) {
        return new this.constructor(this.address, this.abi, this.api, signer);
    }
    /**
     * Create Contract Instances by Contract Address
     *
     * @param address Contract address
     * @returns Contract
     */
    attach(address) {
        return new this.constructor(address, this.abi, this.api, this.signer);
    }
}
exports.Contract = Contract;
//# sourceMappingURL=contract.js.map