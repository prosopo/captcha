import { ApiPromise } from '@polkadot/api';
import { WsProvider } from '@polkadot/rpc-provider/ws';
import { Network, NetworkUserConfig } from '../types/network';
import { AccountSigner } from '../signer/accountsigner';
import { KeyringPair } from "@polkadot/keyring/types";
import { Signer } from '../signer/signer';
export declare function createSigner(signer: AccountSigner, pair: KeyringPair): Signer;
export declare function addPair(signer: AccountSigner, pair: KeyringPair): KeyringPair;
export declare function createNetwork(mnemonic: string, networkConfig: NetworkUserConfig): Promise<Network>;
export declare function createApi(provider: WsProvider): ApiPromise;
//# sourceMappingURL=network.d.ts.map