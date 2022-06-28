"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signer = void 0;
const tslib_1 = require("tslib");
// import type { Signer as PolkadotSigner } from '@polkadot/api/types';
/**
 * A wrapper for Keyringpair
 */
class Signer {
    /**
     *
     * @param pair An instantiation of keyringpair
     * @param accountSigner
     */
    constructor(pair, accountSigner) {
        this.pair = pair;
        this.accountSigner = accountSigner;
    }
    /**
     * @description The Account address
     */
    get address() {
        return this.pair.address;
    }
    /**
     * @description The Account address
     */
    get addressRaw() {
        return this.pair.addressRaw;
    }
    /**
     * @description Public key of account
     */
    get publicKey() {
        return this.pair.publicKey;
    }
    /**
     * @description Public key of account
     */
    sign(data, options) {
        return this.pair.sign(data, options);
    }
    /**
     * Returns the signature of the transaction
     *
     * @param payload - The data to be signed
     * @returns The signature of the transaction
     *
     */
    signPayload(payload) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return this.accountSigner.signPayload(payload);
        });
    }
    /**
     * Get account address asynchronously
     *
     * @returns Account address
     *
     */
    getAddress() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return Promise.resolve(this.pair.address);
        });
    }
    setKeyPair(pair) {
        this.pair = pair;
    }
}
exports.Signer = Signer;
//# sourceMappingURL=signer.js.map