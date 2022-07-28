"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApi = exports.createNetwork = exports.addPair = exports.createSigner = void 0;
const tslib_1 = require("tslib");
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo-io/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
const api_1 = require("@polkadot/api");
const ws_1 = require("@polkadot/rpc-provider/ws");
const keyring_1 = tslib_1.__importDefault(require("@polkadot/keyring"));
const accountsigner_1 = require("../signer/accountsigner");
const signer_1 = require("../signer/signer");
function createSigner(signer, pair) {
    return new signer_1.Signer(pair, signer);
}
exports.createSigner = createSigner;
function addPair(signer, pair) {
    return signer.addPair(pair);
}
exports.addPair = addPair;
function createNetwork(mnemonic, networkConfig) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const provider = new ws_1.WsProvider(networkConfig.endpoint);
        const api = yield createApi(provider);
        const registry = api.registry;
        const keyring = new keyring_1.default({
            type: 'sr25519'
        });
        yield api.isReadyOrError;
        const signer = new accountsigner_1.AccountSigner();
        const pair = keyring.addFromMnemonic(mnemonic);
        const pairs = keyring.getPairs();
        const findKeyringPair = pairs.find((pair) => registry.createType('AccountId', pair.address).eq(pair.address));
        if (networkConfig.accounts)
            signer.init(registry, networkConfig.accounts);
        signer.setUp && signer.setUp();
        yield addPair(signer, pair);
        if (!findKeyringPair) {
            throw new Error(`Can't find the keyringpair for ${pair.address}`);
        }
        const network = {
            provider: provider,
            api: api,
            registry: registry,
            keyring: keyring,
            keyringPair: pair,
            signer: signer,
            getAddresses: () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield api.isReady;
                const pairs = signer.getPairs();
                return pairs.map((pair) => {
                    return pair.address;
                });
            }),
        };
        return network;
    });
}
exports.createNetwork = createNetwork;
function createApi(provider) {
    return new api_1.ApiPromise({
        provider,
    });
}
exports.createApi = createApi;
//# sourceMappingURL=network.js.map