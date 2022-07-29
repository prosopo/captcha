"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoContractApi = void 0;
const tslib_1 = require("tslib");
const errors_1 = require("../errors");
const helpers_1 = require("./helpers");
const definitions_1 = require("./definitions");
const signer_1 = require("../signer/signer");
const contract_1 = require("./contract");
const util_crypto_1 = require("@polkadot/util-crypto");
const handlers_1 = require("../handlers");
class ProsopoContractApi {
    constructor(contractAddress, mnemonic, contractName, abi, network) {
        this.mnemonic = mnemonic;
        this.contractName = contractName;
        this.contractAddress = contractAddress;
        this.abi = abi;
        this.network = network;
    }
    isReady() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.network.api.isReadyOrError;
            yield this.network.registry.register(definitions_1.contractDefinitions);
            yield this.getSigner();
            yield this.getContract();
            if (this.contract === undefined) {
                throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.CONTRACT_UNDEFINED.message, 'isReady');
            }
        });
    }
    getSigner() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.network.api.isReadyOrError;
            const { mnemonic } = this;
            if (!mnemonic) {
                throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.SIGNER_UNDEFINED.message);
            }
            const keyringPair = this.network.keyring.addFromMnemonic(mnemonic);
            const accountSigner = this.network.signer;
            const signer = new signer_1.Signer(keyringPair, accountSigner);
            accountSigner.addPair(signer.pair);
            this.signer = signer;
            return signer;
        });
    }
    changeSigner(mnemonic) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.network.api.isReadyOrError;
            this.mnemonic = mnemonic;
            return yield this.getSigner();
        });
    }
    getContract() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.network.api.isReadyOrError;
            const contract = new contract_1.Contract(this.contractAddress, this.abi, this.network.api, this.signer);
            if (!contract) {
                throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.CONTRACT_UNDEFINED.message, 'getContract', [this.contractAddress]);
            }
            this.contract = contract;
            return contract;
        });
    }
    createAccountAndAddToKeyring() {
        const mnemonic = (0, util_crypto_1.mnemonicGenerate)();
        const account = this.network.keyring.addFromMnemonic(mnemonic);
        const { address } = account;
        return [mnemonic, address];
    }
    /**
     * Operations to carry out before calling contract
     */
    beforeCall(contractMethodName, args) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const contract = yield this.getContract();
            if (!this.signer) {
                throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.SIGNER_UNDEFINED.message, 'beforeCall');
            }
            const signedContract = contract.connect(this.signer);
            const methodObj = this.getContractMethod(contractMethodName);
            const encodedArgs = (0, helpers_1.encodeStringArgs)(methodObj, args);
            return { signedContract, encodedArgs };
        });
    }
    /**
     * Perform a contract tx (mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param {number | undefined} value   The value of token that is sent with the transaction
     * @return JSON result containing the contract event
     */
    contractTx(contractMethodName, args, value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // Always query first as errors are passed back from a dry run but not from a transaction
            yield this.contractQuery(contractMethodName, args);
            const { encodedArgs, signedContract } = yield this.beforeCall(contractMethodName, args);
            let response;
            if (value) {
                response = yield signedContract.tx[contractMethodName](...encodedArgs, { value, signer: this.signer });
            }
            else {
                response = yield signedContract.tx[contractMethodName](...encodedArgs, { signer: this.signer });
            }
            if (response.result.status.isRetracted) {
                throw new handlers_1.ProsopoContractError(response.status.asRetracted, contractMethodName);
            }
            if (response.result.status.isInvalid) {
                throw new handlers_1.ProsopoContractError(response.status.asInvalid, contractMethodName);
            }
            return response;
        });
    }
    /**
     * Perform a contract query (non-mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param atBlock
     * @return JSON result containing the contract event
     */
    contractQuery(contractMethodName, args, atBlock) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { encodedArgs, signedContract } = yield this.beforeCall(contractMethodName, args);
            const query = !atBlock ? signedContract.query[contractMethodName] : signedContract.queryAt(atBlock, signedContract.abi.findMessage(contractMethodName));
            const response = yield query(...encodedArgs);
            // @ts-ignore
            (0, helpers_1.handleContractCallOutcomeErrors)(response, contractMethodName, encodedArgs);
            if (response.result.isOk) {
                if (response.output) {
                    return (0, helpers_1.unwrap)(response.output.toHuman());
                }
                else {
                    return [];
                }
            }
            throw new handlers_1.ProsopoContractError(response.result.asErr, 'contractQuery');
        });
    }
    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod(contractMethodName) {
        var _a;
        const methodObj = (_a = this.contract) === null || _a === void 0 ? void 0 : _a.abi.messages.filter((obj) => obj.method === contractMethodName)[0];
        if (methodObj !== undefined) {
            return methodObj;
        }
        throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.INVALID_METHOD.message, 'contractMethodName');
    }
    /** Get the storage key from the ABI given a storage name
     * @return the storage key
     */
    getStorageKey(storageName) {
        if (!this.contract) {
            throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.CONTRACT_UNDEFINED.message);
        }
        const json = this.contract.abi.json;
        // Find the different metadata version key, V1, V2, V3, etc.
        const storageKey = Object.keys(json).filter(key => key.search(/V\d/) > -1);
        let data;
        if (storageKey.length) {
            // @ts-ignore
            data = json[storageKey[0]];
        }
        else {
            // The metadata version is not present and its the old AbiMetadata
            data = json;
        }
        const storageEntry = data.storage.struct.fields.filter((obj) => obj.name === storageName)[0];
        if (storageEntry) {
            return storageEntry.layout.cell.key;
        }
        throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.INVALID_STORAGE_NAME.message, 'getStorageKey');
    }
    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    getStorage(name, decodingFn) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.getContract();
            const storageKey = this.getStorageKey(name);
            if (!this.contract) {
                throw new handlers_1.ProsopoContractError(errors_1.ERRORS.CONTRACT.CONTRACT_UNDEFINED.message);
            }
            const promiseResult = yield this.network.api.rpc.contracts.getStorage(this.contract.address, storageKey);
            const data = promiseResult.unwrapOrDefault();
            return decodingFn(this.network.registry, data);
        });
    }
}
exports.ProsopoContractApi = ProsopoContractApi;
//# sourceMappingURL=interface.js.map