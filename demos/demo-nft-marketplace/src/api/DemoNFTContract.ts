import { ApiPromise, SubmittableResult, WsProvider } from '@polkadot/api';
import { Abi, ContractPromise } from '@polkadot/api-contract';
import { Signer } from '@polkadot/api/types';
// import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { AsyncFactory, TransactionResponse } from '@prosopo/procaptcha';
import { encodeStringArgs, unwrap } from '@prosopo/procaptcha/build/common';
import { AnyJson } from '@polkadot/types/types/codec';

import abiJson from './abi.json';

class DemoNFTContract extends AsyncFactory {
  private api: ApiPromise;
  private abi: Abi;
  private contract: ContractPromise;
  private account;

  public address: string;

  /**
   * @param address
   * @param account
   * @param providerInterface
   */
  public async init(address: string, providerInterface: ProviderInterface) {
    this.api = await ApiPromise.create({ provider: providerInterface });
    this.abi = new Abi(abiJson, this.api.registry.getChainProperties());
    this.contract = new ContractPromise(this.api, this.abi, address);
    this.address = address;
    return this;
  }

  public setAccount(account): void {
    this.account = account;
  }

  public async query<T>(method: string, args: any[]): Promise<T | AnyJson | null> {
    try {
      const abiMessage = this.abi.findMessage(method);
      const response = await this.contract.query[method](
        this.account?.address,
        {},
        ...encodeStringArgs(abiMessage, args)
      );
      console.log('QUERY RESPONSE', response);
      if (response.result.isOk) {
        if (response.output) {
          return unwrap(response.output.toHuman());
        } else {
          return null;
        }
      } else {
        throw new Error(response.result.asErr.asModule.message.unwrap().toString());
      }
    } catch (e) {
      console.error('ERROR', e);
      return null;
    }
  }

  // https://polkadot.js.org/docs/api/cookbook/tx/
  // https://polkadot.js.org/docs/api/start/api.tx.subs/
  public async transaction(signer: Signer, method: string, args: any[]): Promise<TransactionResponse> {
    // TODO if DEBUG==true || env.development
    const queryBeforeTx = await this.query(method, args);

    console.log('QUERY BEFORE TX....................', queryBeforeTx);

    const abiMessage = this.abi.findMessage(method);

    const extrinsic = this.contract.tx[method]({}, ...encodeStringArgs(abiMessage, args));

    // this.api.setSigner(signer);
    // const response = await buildTx(this.api.registry, extrinsic, this.account.address, { signer });
    // console.log("buildTx RESPONSE", response);
    // return;

    return new Promise((resolve, reject) => {
      extrinsic
        .signAndSend(this.account.address, { signer }, (result: SubmittableResult) => {
          const { dispatchError, dispatchInfo, events, internalError, status, txHash, txIndex } = result;

          console.log('TX STATUS', status.type);
          console.log('IS FINALIZED', status?.isFinalized);
          console.log('IN BLOCK', status?.isInBlock);
          console.log('EVENTS', events);

          if (internalError) {
            console.error('internalError', internalError);
            reject(internalError);

            return;
          }

          if (dispatchError) {
            console.error('dispatchError', dispatchError);
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
          console.error('signAndSend ERROR', e);
          reject(e);
        });
    });
  }
}

// const contractPromise = DemoNFTContract.create(
//   '5DMKFG4JfJQcNWjDfAkRhUmUX3pUsSx8aUdYakxsJY7e8Pf2',
//   new WsProvider('ws://127.0.0.1:9944')
// );

export default DemoNFTContract;
