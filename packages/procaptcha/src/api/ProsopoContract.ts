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
// import {Hash} from '@polkadot/types/interfaces';
import ProsopoContractBase from "./ProsopoContractBase";
import { Signer } from '@polkadot/api/types';
import {ProsopoDappOperatorIsHumanUserResponse, TransactionResponse} from '../types';
import { ProsopoRandomProviderResponse } from "../types";
import { CaptchaSolutionCommitment } from "@prosopo/contract";


export class ProsopoContract extends ProsopoContractBase {

    public async getRandomProvider(): Promise<ProsopoRandomProviderResponse> {
        return await this.query('getRandomActiveProvider', [this.account.address, this.dappAddress]) as ProsopoRandomProviderResponse;
    }

    public async getCaptchaSolutionCommitment(commitmentId: string) {
        return await this.query('getCaptchaSolutionCommitment', [commitmentId]) as CaptchaSolutionCommitment;
    }

    public async dappUserCommit(signer: Signer, captchaDatasetId: string, userMerkleTreeRoot: string, providerAddress: string): Promise<TransactionResponse> {
        return await this.transaction(signer, 'dappUserCommit', [this.dappAddress, captchaDatasetId, userMerkleTreeRoot, providerAddress]);
    }

    public async dappOperatorIsHumanUser(solutionThreshold: number): Promise<ProsopoDappOperatorIsHumanUserResponse> {
        
        return await this.query('dappOperatorIsHumanUser', [this.account.address, solutionThreshold]) as ProsopoDappOperatorIsHumanUserResponse;
    }



}

export default ProsopoContract;
