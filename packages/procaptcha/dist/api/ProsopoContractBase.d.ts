import { ApiPromise } from "@polkadot/api";
import { Abi, ContractPromise } from "@polkadot/api-contract";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { AnyJson } from "@polkadot/types/types/codec";
import { ProviderInterface } from "@polkadot/rpc-provider/types";
import { Signer } from "@polkadot/api/types";
import { TransactionResponse } from '../types';
import AsyncFactory from "./AsyncFactory";
export declare class ProsopoContractBase extends AsyncFactory {
    protected api: ApiPromise;
    protected abi: Abi;
    protected contract: ContractPromise;
    protected account: InjectedAccountWithMeta;
    protected dappAddress: string;
    address: string;
    /**
   * @param address
   * @param dappAddress
   * @param account
   * @param providerInterface
   */
    init(address: string, dappAddress: string, account: InjectedAccountWithMeta, providerInterface: ProviderInterface): Promise<this>;
    getApi(): ApiPromise;
    getContract(): ContractPromise;
    getAccount(): InjectedAccountWithMeta;
    getDappAddress(): string;
    query<T>(method: string, args: any[]): Promise<T | AnyJson | null>;
    transaction(signer: Signer, method: string, args: any[]): Promise<TransactionResponse>;
}
export default ProsopoContractBase;
//# sourceMappingURL=ProsopoContractBase.d.ts.map