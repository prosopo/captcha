"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoContractBase = void 0;
const tslib_1 = require("tslib");
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo-io/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
const api_1 = require("@polkadot/api");
const api_contract_1 = require("@polkadot/api-contract");
const contract_1 = require("@prosopo/contract");
const AsyncFactory_1 = tslib_1.__importDefault(require("./AsyncFactory"));
class ProsopoContractBase extends AsyncFactory_1.default {
    api;
    abi;
    contract;
    account;
    dappAddress;
    address;
    /**
     * @param address
     * @param dappAddress
     * @param account
     * @param providerInterface
     */
    async init(address, dappAddress, account, providerInterface) {
        this.api = await api_1.ApiPromise.create({ provider: providerInterface });
        this.abi = new api_contract_1.Abi(contract_1.abiJson, this.api.registry.getChainProperties());
        this.contract = new api_contract_1.ContractPromise(this.api, this.abi, address);
        this.address = address;
        this.dappAddress = dappAddress;
        this.account = account;
        return this;
    }
    getApi() {
        return this.api;
    }
    getContract() {
        return this.contract;
    }
    getAccount() {
        return this.account;
    }
    getDappAddress() {
        return this.dappAddress;
    }
    async query(method, args) {
        try {
            const abiMessage = this.abi.findMessage(method);
            const response = await this.contract.query[method](this.account.address, {}, ...(0, contract_1.encodeStringArgs)(abiMessage, args));
            console.log("QUERY RESPONSE", method, args, response);
            if (response.result.isOk) {
                if (response.output) {
                    return (0, contract_1.unwrap)(response.output.toHuman());
                }
                else {
                    return null;
                }
            }
            else {
                throw new contract_1.ProsopoContractError(response.result.asErr);
            }
        }
        catch (e) {
            console.error("ERROR", e);
            return null;
        }
    }
    // https://polkadot.js.org/docs/api/cookbook/tx/
    // https://polkadot.js.org/docs/api/start/api.tx.subs/
    async transaction(signer, method, args) {
        // TODO if DEBUG==true || env.development
        const queryBeforeTx = await this.query(method, args);
        console.log("QUERY BEFORE TX....................", queryBeforeTx);
        const abiMessage = this.abi.findMessage(method);
        const extrinsic = this.contract.tx[method]({}, ...(0, contract_1.encodeStringArgs)(abiMessage, args));
        // this.api.setSigner(signer);
        // const response = await buildTx(this.api.registry, extrinsic, this.account.address, { signer });
        // console.log("buildTx RESPONSE", response);
        // return;
        return new Promise((resolve, reject) => {
            extrinsic.signAndSend(this.account.address, { signer }, (result) => {
                const { dispatchError, dispatchInfo, events, internalError, status, txHash, txIndex } = result;
                console.log("TX STATUS", status.type);
                console.log("IS FINALIZED", status?.isFinalized);
                console.log("IN BLOCK", status?.isInBlock);
                console.log("EVENTS", events);
                if (internalError) {
                    console.error("internalError", internalError);
                    reject(internalError);
                    return;
                }
                if (dispatchError) {
                    console.error("dispatchError", dispatchError);
                    reject(dispatchError);
                    return;
                }
                // [Ready, InBlock, Finalized...]
                // Instant seal ON.
                if (status?.isInBlock) {
                    const blockHash = status.asInBlock.toHex();
                    resolve({ dispatchError, dispatchInfo, events, internalError, status, txHash, txIndex, blockHash });
                }
                // TODO
                // Instant seal OFF.
                // if (status?.isFinalized) {
                //   const blockHash = status.asFinalized.toHex();
                //   resolve({ dispatchError, dispatchInfo, events, internalError, status, txHash, txIndex, blockHash });
                // }
            })
                .catch((e) => {
                console.error("signAndSend ERROR", e);
                reject(e);
            });
        });
    }
}
exports.ProsopoContractBase = ProsopoContractBase;
exports.default = ProsopoContractBase;
//# sourceMappingURL=ProsopoContractBase.js.map