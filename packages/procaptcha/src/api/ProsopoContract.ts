// import {Hash} from '@polkadot/types/interfaces';
import ProsopoContractBase from "./ProsopoContractBase";
import { Signer } from '@polkadot/api/types';
import { TransactionResponse } from '../types/contract';

// TODO: import return types from provider: separate types/common package.
export class ProsopoContract extends ProsopoContractBase {

    public async getRandomProvider(): Promise<ProsopoRandomProviderResponse> {
        return await this.query('getRandomActiveProvider', [this.account.address, this.dappAddress]) as ProsopoRandomProviderResponse;
    }

    public async dappUserCommit(signer: Signer, captchaDatasetId: string, userMerkleTreeRoot: string, providerAddress: string): Promise<TransactionResponse> {
        return await this.transaction(signer, 'dappUserCommit', [this.dappAddress, captchaDatasetId, userMerkleTreeRoot, providerAddress]);
    }

}

export default ProsopoContract;
