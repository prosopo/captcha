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
import { ApiPromise, SubmittableResult } from "@polkadot/api";
import { Abi, ContractPromise } from "@polkadot/api-contract";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import { abiJson, unwrap, encodeStringArgs, ProsopoContractError } from "@prosopo/contract";
import { AnyJson } from "@polkadot/types/types/codec";
import { ProviderInterface } from "@polkadot/rpc-provider/types";
import { Signer } from "@polkadot/api/types";
import { TransactionResponse } from '../types';
import AsyncFactory from "./AsyncFactory";
import {decodeAddress, encodeAddress, Keyring} from "@polkadot/keyring";
import {KeyringPair} from "@polkadot/keyring/types";
import {cryptoWaitReady, mnemonicGenerate} from "@polkadot/util-crypto";

export class ProsopoContractBase extends AsyncFactory {

    protected api: ApiPromise;
    protected abi: Abi;
    protected contract: ContractPromise;
    protected account: InjectedAccountWithMeta;
    protected dappAddress: string;

    public address: string;

    /**
   * @param address
   * @param dappAddress
   * @param account
   * @param providerInterface
   */
    public async init(address: string, dappAddress: string, account: InjectedAccountWithMeta, providerInterface: ProviderInterface) {
        this.api = await ApiPromise.create({ provider: providerInterface });
        this.abi = new Abi(abiJson, this.api.registry.getChainProperties());
        this.contract = new ContractPromise(this.api, this.abi, address);
        this.address = address;
        this.dappAddress = dappAddress;
        this.account = account;
        return this;
    }

    public getApi(): ApiPromise {
        return this.api;
    }

    public getContract(): ContractPromise {
        return this.contract;
    }

    public getAccount(): InjectedAccountWithMeta {
        return this.account;
    }

    public getDappAddress(): string {
        return this.dappAddress;
    }


    public async query<T>(method: string, args: any[]): Promise<T | AnyJson | null> {
        try {
            const abiMessage = this.abi.findMessage(method);
            const response = await this.contract.query[method](
                this.account.address,
                {},
                ...encodeStringArgs(abiMessage, args)
            );
            console.log("QUERY RESPONSE", method, args, response);
            if (response.result.isOk) {
                if (response.output) {
                    return unwrap(response.output.toHuman());
                } else {
                    return null;
                }
            } else {
                throw new ProsopoContractError(response.result.asErr);
            }
        } catch (e) {
            console.error("ERROR", e);
            return null;
        }
    }

    // https://polkadot.js.org/docs/api/cookbook/tx/
    // https://polkadot.js.org/docs/api/start/api.tx.subs/
    public async transaction(signer: Signer, method: string, args: any[]): Promise<TransactionResponse> {


        const queryBeforeTx = await this.query(method, args);

        console.log("QUERY BEFORE TX....................", queryBeforeTx);

        const abiMessage = this.abi.findMessage(method);

        const extrinsic = this.contract.tx[method]({}, ...encodeStringArgs(abiMessage, args));

        // this.api.setSigner(signer);
        // const response = await buildTx(this.api.registry, extrinsic, this.account.address, { signer });
        // console.log("buildTx RESPONSE", response);
        // return;

        return new Promise((resolve, reject) => {

            extrinsic.signAndSend(this.account.address, { signer }, (result: SubmittableResult) => {

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

export default ProsopoContractBase;
