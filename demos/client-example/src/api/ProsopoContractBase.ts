import { ApiPromise, SubmittableResult } from "@polkadot/api";
import { Abi, ContractPromise } from "@polkadot/api-contract";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import abiJson from "../abi/prosopo.json";
import { AnyJson } from "@polkadot/types/types/codec";
import { ProviderInterface } from "@polkadot/rpc-provider/types";
import { unwrap, encodeStringArgs } from "../common/helpers";
import Extension, { NoExtensionCallback } from "./Extension";
import { Signer } from "@polkadot/api/types";
import { buildTx } from "@prosopo/contract";
import { contractDefinitions } from "@prosopo/contract";
import { TransactionResponse } from '../types/contract';
import AsyncFactory from "./AsyncFactory";

export class ProsopoContractBase extends AsyncFactory {

  protected api: ApiPromise;
  protected abi: Abi;
  protected contract: ContractPromise;
  protected account: InjectedAccountWithMeta;
  protected dappAddress: string;

  public address: string;

  /**
   * @param address
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
      if (response.result.isOk) {
        if (response.output) {
          return unwrap(response.output.toHuman());
        } else {
          return null;
        }
      } else {
        throw new Error(
          response.result.asErr.asModule.message.unwrap().toString()
        );
      }
    } catch (e) {
      console.error("ERROR", e);
      return null;
    }
  }

  // https://polkadot.js.org/docs/api/cookbook/tx/
  // https://polkadot.js.org/docs/api/start/api.tx.subs/
  public async transaction(signer: Signer, method: string, args: any[]): Promise<TransactionResponse> {

    // TODO if DEBUG==true || env.development
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
        if (status?.isFinalized) {
          
          const blockHash = status.asFinalized.toHex();

          resolve({ dispatchError, dispatchInfo, events, internalError, status, txHash, txIndex, blockHash });
          
        }

      })
      .catch((e) => { 
        console.error("signAndSend ERROR", e);
        reject(e);
      });

    });

  }

}

export default ProsopoContractBase;
