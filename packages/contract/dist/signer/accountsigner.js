"use strict";
var _AccountSigner_keyring, _AccountSigner_config, _AccountSigner_registry;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountSigner = void 0;
const tslib_1 = require("tslib");
const keyring_1 = tslib_1.__importDefault(require("@polkadot/keyring"));
const util_1 = require("@polkadot/util");
let id = 0;
class AccountSigner {
    constructor() {
        _AccountSigner_keyring.set(this, void 0);
        _AccountSigner_config.set(this, []);
        _AccountSigner_registry.set(this, void 0);
        this.init = (registry, config) => {
            tslib_1.__classPrivateFieldSet(this, _AccountSigner_registry, registry, "f");
            tslib_1.__classPrivateFieldSet(this, _AccountSigner_config, config, "f");
        };
        this.findKeyringPair = (address) => {
            const pairs = tslib_1.__classPrivateFieldGet(this, _AccountSigner_keyring, "f").getPairs();
            const findKeyringPair = pairs.find((pair) => tslib_1.__classPrivateFieldGet(this, _AccountSigner_registry, "f").createType('AccountId', pair.address).eq(address));
            if (!findKeyringPair) {
                throw new Error(`Can't find the keyringpair for ${address}`);
            }
            return findKeyringPair;
        };
        this.signRaw = (raw) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const signed = this.findKeyringPair(raw.address).sign(raw.data);
                resolve({ id: ++id, signature: (0, util_1.u8aToHex)(signed) });
            });
        });
        this.signPayload = (payload) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const pair = this.findKeyringPair(payload.address);
            return new Promise((resolve) => {
                const signed = tslib_1.__classPrivateFieldGet(this, _AccountSigner_registry, "f")
                    .createType('ExtrinsicPayload', payload, { version: payload.version })
                    .sign(pair);
                resolve(Object.assign({ id: ++id }, signed));
            });
        });
        this.setUp = () => {
            for (const account of tslib_1.__classPrivateFieldGet(this, _AccountSigner_config, "f")) {
                let pair;
                try {
                    const meta = {
                        name: account.replace('//', '_').toLowerCase()
                    };
                    pair = this.keyring.addFromUri(account, meta);
                    pair.suri = account;
                    pair.lock = () => {
                    };
                }
                catch (error) {
                    console.log(error.message);
                    throw new Error(`ERRORS.GENERAL.BAD_SURI.message: {uri: ${account}}`);
                }
            }
        };
        this.getPairs = () => {
            return this.keyring.getPairs();
        };
        this.addPair = (pair) => {
            return this.keyring.addPair(pair);
        };
        tslib_1.__classPrivateFieldSet(this, _AccountSigner_keyring, new keyring_1.default({
            type: 'sr25519'
        }), "f");
    }
    get keyring() {
        return tslib_1.__classPrivateFieldGet(this, _AccountSigner_keyring, "f");
    }
}
exports.AccountSigner = AccountSigner;
_AccountSigner_keyring = new WeakMap(), _AccountSigner_config = new WeakMap(), _AccountSigner_registry = new WeakMap();
//# sourceMappingURL=accountsigner.js.map