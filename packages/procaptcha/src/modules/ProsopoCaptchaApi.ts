import { randomAsHex, blake2AsHex } from '@polkadot/util-crypto';
// import {computeCaptchaSolutionHash} from '@prosopo/provider'; // TODO
import { CaptchaSolution, CaptchaMerkleTree } from '@prosopo/provider';
import { Signer } from "@polkadot/api/types";

import { ProsopoRandomProviderResponse, GetCaptchaResponse, CaptchaSolutionResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import ProviderApi from "../api/ProviderApi";
import ProsopoContract from "../api/ProsopoContract";


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
            throw new Error(err);
        }
        return captchaChallenge;
    }

    public async submitCaptchaSolution(signer: Signer, requestHash: string, captchaId: string, datasetId: string, solution: number[]): Promise<[CaptchaSolutionResponse, TransactionResponse]> {
        const salt = randomAsHex();
        const merkleTree = new CaptchaMerkleTree(); // TODO move to contract?
        const saltedCaptchas: CaptchaSolution[] = [{ captchaId, solution, salt }];
        const hashedCaptchas = saltedCaptchas.map(captcha => computeCaptchaSolutionHash(captcha));
        merkleTree.build(hashedCaptchas);
        const merkleTreeRoot = merkleTree.root!.hash;

        let tx: TransactionResponse;

        try {
            tx = await this.contract.dappUserCommit(signer, datasetId as string, merkleTreeRoot, this.provider.providerId);
        } catch (err) {
            throw new Error(err);
        }

        let result: CaptchaSolutionResponse;

        try {
            result = await this.providerApi.submitCaptchaSolution(tx.blockHash!, saltedCaptchas, requestHash, tx.txHash.toString(), this.contract.getAccount().address);
        } catch (err) {
            throw new Error(err);
        }

        return [result, tx];
    }

}

export default ProsopoCaptchaApi;

