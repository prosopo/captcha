// import {Hash} from '@polkadot/types/interfaces';
import ProsopoContractBase from "./ProsopoContractBase";
import { Signer } from '@polkadot/api/types';
import { TransactionResponse } from '../types';
import { ProsopoRandomProviderResponse } from "../types";
import { CaptchaSolutionCommitment } from "@prosopo/provider";

// TODO: import return types from provider: separate types/common package.
export class ProsopoContract extends ProsopoContractBase {

    public async getRandomProvider(): Promise<ProsopoRandomProviderResponse> {
        return await this.query('getRandomActiveProvider', [this.account.address, this.dappAddress]) as ProsopoRandomProviderResponse;
    }

    public async getCaptchaSolutionCommitment(commitmentId:string) {
        return await this.query('getCaptchaSolutionCommitment', [commitmentId]) as CaptchaSolutionCommitment;
    }

    public async dappUserCommit(signer: Signer, captchaDatasetId: string, userMerkleTreeRoot: string, providerAddress: string): Promise<TransactionResponse> {
        return await this.transaction(signer, 'dappUserCommit', [this.dappAddress, captchaDatasetId, userMerkleTreeRoot, providerAddress]);
    }



}

export default ProsopoContract;
