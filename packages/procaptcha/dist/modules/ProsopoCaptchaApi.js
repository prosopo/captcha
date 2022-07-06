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
// import {computeCaptchaSolutionHash} from '@prosopo/provider'; // TODO
import { CaptchaMerkleTree } from '@prosopo/contract';
import { ProsopoApiError } from "../api/handlers";
function hexHash(data) {
    return blake2AsHex(data);
}
function computeCaptchaSolutionHash(captcha) {
    return hexHash([captcha.captchaId, captcha.solution, captcha.salt].join());
}
export class ProsopoCaptchaApi {
    contract;
    provider;
    providerApi;
    constructor(contract, provider, providerApi) {
        this.contract = contract;
        this.provider = provider;
        this.providerApi = providerApi;
    }
    async getCaptchaChallenge() {
        let captchaChallenge;
        try {
            captchaChallenge = await this.providerApi.getCaptchaChallenge(this.provider);
        }
        catch (err) {
            throw new ProsopoApiError(err);
        }
        return captchaChallenge;
    }
    async submitCaptchaSolution(signer, requestHash, datasetId, solutions) {
        const salt = randomAsHex();
        const tree = new CaptchaMerkleTree();
        const captchaSolutionsSalted = solutions.map(solution => ({ ...solution, salt: salt }));
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha));
        tree.build(captchasHashed);
        const commitmentId = tree.root.hash;
        console.log("solveCaptchaChallenge commitmentId", commitmentId);
        // console.log("solveCaptchaChallenge USER ACCOUNT", this.contract.getAccount().address);
        // console.log("solveCaptchaChallenge DAPP ACCOUNT", this.contract.getDappAddress());
        // console.log("solveCaptchaChallenge CONTRACT ADDRESS", this.contract.getContract().address.toString());
        let tx;
        try {
            tx = await this.contract.dappUserCommit(signer, datasetId, commitmentId, this.provider.providerId);
        }
        catch (err) {
            throw new ProsopoApiError(err);
        }
        let result;
        try {
            const res = await this.providerApi.submitCaptchaSolution(tx.blockHash, captchaSolutionsSalted, requestHash, tx.txHash.toString(), this.contract.getAccount().address);
            result = {
                ...res,
                captchas: res.captchas.map(({ partialFee, ...rest }) => ({ ...rest })),
                partialFee: res.captchas[0].partialFee
            };
        }
        catch (err) {
            throw new ProsopoApiError(err);
        }
        let commitment;
        // TODO concurrency?
        try {
            commitment = await this.contract.getCaptchaSolutionCommitment(commitmentId);
        }
        catch (err) {
            throw new ProsopoApiError(err);
        }
        return [result, tx, commitment];
    }
}
export default ProsopoCaptchaApi;
//# sourceMappingURL=ProsopoCaptchaApi.js.map