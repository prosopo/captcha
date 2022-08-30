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
import { randomAsHex, blake2AsHex } from '@polkadot/util-crypto';
// import {computeCaptchaSolutionHash} from '@prosopo/provider'; 
import { CaptchaSolution, CaptchaMerkleTree, CaptchaSolutionCommitment } from '@prosopo/contract';
import { Signer } from "@polkadot/api/types";

import { ProsopoRandomProviderResponse, GetCaptchaResponse, CaptchaSolutionResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import ProviderApi from "../api/ProviderApi";
import ProsopoContract from "../api/ProsopoContract";
import { TCaptchaSubmitResult } from '../types/client';
import {ProsopoApiError} from "../api/handlers";
import { hashSolutions } from '@prosopo/contract';


function hexHash(data: string | Uint8Array): string {
    return blake2AsHex(data);
}

function computeCaptchaSolutionHash(captcha: CaptchaSolution) {
    return hexHash([captcha.captchaId, captcha.solution, captcha.salt].join());
}

export class ProsopoCaptchaApi {

    protected contract: ProsopoContract;
    protected provider: ProsopoRandomProviderResponse;
    protected providerApi: ProviderApi;

    constructor(contract: ProsopoContract, provider: ProsopoRandomProviderResponse, providerApi: ProviderApi) {
        this.contract = contract;
        this.provider = provider;
        this.providerApi = providerApi;
    }

    public async getCaptchaChallenge(): Promise<GetCaptchaResponse> {
        let captchaChallenge: GetCaptchaResponse;
        try {
            captchaChallenge = await this.providerApi.getCaptchaChallenge(this.provider);
        } catch (err) {
            throw new ProsopoApiError(err)
        }
        return captchaChallenge;
    }

    public async submitCaptchaSolution(signer: Signer, requestHash: string, datasetId: string, solutions: CaptchaSolution[]) : Promise<TCaptchaSubmitResult> {
        const salt = randomAsHex();
        const tree = new CaptchaMerkleTree();
        const captchaSolutionsSalted: CaptchaSolution[] = hashSolutions(solutions);
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha));

        tree.build(captchasHashed);
        const commitmentId = tree.root!.hash;

        console.log("solveCaptchaChallenge commitmentId", commitmentId);
        // console.log("solveCaptchaChallenge USER ACCOUNT", this.contract.getAccount().address);
        // console.log("solveCaptchaChallenge DAPP ACCOUNT", this.contract.getDappAddress());
        // console.log("solveCaptchaChallenge CONTRACT ADDRESS", this.contract.getContract().address.toString());

        let tx: TransactionResponse;

        try {
            tx = await this.contract.dappUserCommit(signer, datasetId as string, commitmentId, this.provider.providerId);
        } catch (err) {
            throw new ProsopoApiError(err)
        }

        let result: CaptchaSolutionResponse;

        try {
            result = await this.providerApi.submitCaptchaSolution(tx.blockHash!, captchaSolutionsSalted, requestHash, tx.txHash.toString(), this.contract.getAccount().address);
        } catch (err) {
            throw new ProsopoApiError(err)
        }

        let commitment: CaptchaSolutionCommitment;

        
        try {
            commitment = await this.contract.getCaptchaSolutionCommitment(commitmentId);
        } catch (err) {
            throw new ProsopoApiError(err)
        }

        return [result, tx, commitment];
    }

}

export default ProsopoCaptchaApi;

