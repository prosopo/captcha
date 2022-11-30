// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
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
import { CaptchaMerkleTree, CaptchaSolution, CaptchaSolutionCommitment, verifyProof } from '@prosopo/datasets'
import { Signer } from '@polkadot/api/types'

import { CaptchaSolutionResponse, GetCaptchaResponse, ProsopoRandomProviderResponse } from '../types/api'
import { TransactionResponse } from '../types/contract'

import { ProviderApi } from '@prosopo/api'
import ProsopoContract from '../api/ProsopoContract'
import { TCaptchaSubmitResult } from '../types/client'
import { ProsopoApiError } from '../api/handlers'
import { ProsopoEnvError } from '@prosopo/datasets'
import { computeCaptchaSolutionHash } from '@prosopo/datasets'
import { stringToHex } from '@polkadot/util'

export class ProsopoCaptchaApi {
    userAccount: string
    contract: ProsopoContract
    provider: ProsopoRandomProviderResponse
    providerApi: ProviderApi
    private web2: boolean

    constructor(
        userAccount: string,
        contract: ProsopoContract,
        provider: ProsopoRandomProviderResponse,
        providerApi: ProviderApi,
        web2: boolean
    ) {
        this.userAccount = userAccount
        this.contract = contract
        this.provider = provider
        this.providerApi = providerApi
        this.web2 = web2
    }

    public async getCaptchaChallenge(): Promise<GetCaptchaResponse> {
        const captchaChallenge: GetCaptchaResponse = await this.providerApi.getCaptchaChallenge(
            this.userAccount,
            this.provider
        )
        this.verifyCaptchaChallengeContent(this.provider, captchaChallenge)
        return captchaChallenge
    }

    public verifyCaptchaChallengeContent(
        provider: ProsopoRandomProviderResponse,
        captchaChallenge: GetCaptchaResponse
    ): void {
        // TODO make sure root is equal to root on the provider
        const proofLength = captchaChallenge.captchas[0].proof.length
        console.log(provider.provider)
        console.log(provider.provider.datasetIdContent, captchaChallenge.captchas[0].proof[proofLength - 1][0])
        if (provider.provider.datasetIdContent !== captchaChallenge.captchas[0].proof[proofLength - 1][0]) {
            throw new ProsopoEnvError('CAPTCHA.INVALID_DATASET_CONTENT_ID')
        }

        for (const captchaWithProof of captchaChallenge.captchas) {
            //TODO calculate the captchaId from the captcha content
            // if (!verifyCaptchaData(captchaWithProof.captcha, captchaWithProof.proof)) {
            //     throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE')
            // }

            if (!verifyProof(captchaWithProof.captcha.captchaContentId, captchaWithProof.proof)) {
                throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE')
            }
        }
        console.log('CAPTCHA.CHALLENGE_VERIFIED')
        return
    }

    public async submitCaptchaSolution(
        signer: Signer,
        requestHash: string,
        datasetId: string,
        solutions: CaptchaSolution[],
        salt: string
    ): Promise<TCaptchaSubmitResult> {
        const tree = new CaptchaMerkleTree()

        const captchasHashed = solutions.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        console.log('solveCaptchaChallenge commitmentId', commitmentId)
        // console.log("solveCaptchaChallenge USER ACCOUNT", this.contract.getAccount().address);
        // console.log("solveCaptchaChallenge DAPP ACCOUNT", this.contract.getDappAddress());
        // console.log("solveCaptchaChallenge CONTRACT ADDRESS", this.contract.getContract().address.toString());
        let tx: TransactionResponse | undefined = undefined

        if (!this.web2) {
            try {
                tx = await this.contract.dappUserCommit(
                    signer,
                    datasetId as string,
                    commitmentId,
                    this.provider.providerId
                )
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        }

        let signature: string | undefined = undefined

        if (this.web2) {
            if (!signer || !signer.signRaw) {
                throw new Error('Signer is not defined, cannot sign message to prove account ownership')
            }
            // sign the request hash to prove account ownership
            const signed = await signer.signRaw({
                address: this.userAccount,
                data: stringToHex(requestHash),
                type: 'bytes',
            })
            signature = signed.signature
        }

        let result: CaptchaSolutionResponse

        try {
            result = await this.providerApi.submitCaptchaSolution(
                solutions,
                requestHash,
                this.contract.userAccountAddress,
                salt,
                tx ? tx?.blockHash : undefined,
                tx ? tx?.txHash.toString() : undefined,
                this.web2,
                signature
            )
        } catch (err) {
            throw new ProsopoApiError(err)
        }

        let commitment: CaptchaSolutionCommitment | undefined = undefined

        if (!this.web2) {
            try {
                commitment = await this.contract.getCaptchaSolutionCommitment(commitmentId)
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        }

        return [result, commitmentId, tx, commitment]
    }
}

export default ProsopoCaptchaApi
