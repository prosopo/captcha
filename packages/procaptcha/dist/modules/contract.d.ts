import ProsopoContract from "../api/ProsopoContract";
import { WsProvider } from "@polkadot/rpc-provider";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { ProviderInterface } from "@polkadot/rpc-provider/types";
export declare function getWsProvider(url?: string): WsProvider;
export declare function getProsopoContract(address: string, dappAddress: string, account: InjectedAccountWithMeta, providerInterface?: ProviderInterface): Promise<ProsopoContract>;
//# sourceMappingURL=contract.d.ts.map