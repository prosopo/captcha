// import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import {randomAsHex} from '@polkadot/util-crypto';
import { blake2AsHex } from '@polkadot/util-crypto';

import ProviderApi from "../api/ProviderApi";
import ProsopoContract from "../api/ProsopoContract";

import {CaptchaSolution, CaptchaMerkleTree} from '@prosopo/provider';
// import {computeCaptchaSolutionHash} from '@prosopo/provider'; // TODO

import { Signer } from "@polkadot/api/types";
import { TransactionResponse } from "../types/contract";


function hexHash(data: string | Uint8Array): string {
    return blake2AsHex(data);
}

function computeCaptchaSolutionHash(captcha: CaptchaSolution) {
    return hexHash([captcha.captchaId, captcha.solution, captcha.salt].join());
}

export class ProCaptcha {

    protected contract: ProsopoContract;
    protected provider: ProsopoRandomProviderResponse;
    protected providerApi: ProviderApi;

    constructor(contract: ProsopoContract, provider: ProsopoRandomProviderResponse, providerApi: ProviderApi) {
        this.contract = contract;
        this.provider = provider;
        this.providerApi = providerApi;
    }

    public async getCaptchaChallenge(): Promise<ProsopoCaptchaResponse> {
        const captchaPuzzle: ProsopoCaptchaResponse = await this.providerApi.getCaptchaChallenge(this.provider);
        console.log("getCaptchaChallenge RECEIVED CAPTCHA", captchaPuzzle);
        return captchaPuzzle;
    }

    public async solveCaptchaChallenge(signer: Signer, requestHash: string, captchaId: string, datasetId: string, solution: number[]) : Promise<CaptchaSolutionResponse> {
        const salt = randomAsHex();
        const tree = new CaptchaMerkleTree();
        const captchaSolutionsSalted: CaptchaSolution[] = [{ captchaId, solution, salt }];
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
        } catch (e) {
            console.error("ERROR", e);
            throw new Error(e.message);
        }

        console.log("solveCaptchaChallenge dappUserCommit TX", tx);

        let result: CaptchaSolutionResponse;

        try {
            result = await this.providerApi.submitCaptchaSolution(tx.blockHash, captchaSolutionsSalted, requestHash, tx.txHash.toString(), this.contract.getAccount().address);
        } catch (e) {
            console.error("ERROR", e);
            throw new Error(e.message);
        }

        return result;
    }

}

export default ProCaptcha;

