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
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { Signer } from '@polkadot/api/types'
import { stringToHex } from '@polkadot/util'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoCaptchaSolutionCommitment, ProsopoContractMethods, ProsopoRandomProvider } from '@prosopo/contract'
import {
    CaptchaMerkleTree,
    computeCaptchaHash,
    computeCaptchaSolutionHash,
    computeItemHash,
    verifyProof,
} from '@prosopo/datasets'
import { CaptchaSolution, CaptchaWithProof } from '@prosopo/types'
import { ProsopoApiError } from '../api/handlers'
import { CaptchaSolutionResponse, GetCaptchaResponse } from '../types/api'
import { TCaptchaSubmitResult } from '../types/client'
import ProviderApi from '@prosopo/api/src/api/ProviderApi'

export class ProsopoCaptchaApi {
    userAccount: string
    contract: ProsopoContractMethods
    provider: ProsopoRandomProvider
    providerApi: ProviderApi
    dappAccount: string
    private web2: boolean

    constructor(
        userAccount: string,
        contract: ProsopoContractMethods,
        provider: ProsopoRandomProvider,
        providerApi: ProviderApi,
        web2: boolean,
        dappAccount: string
    ) {
        this.userAccount = userAccount
        this.contract = contract
        this.provider = provider
        this.providerApi = providerApi
        this.web2 = web2
        this.dappAccount = dappAccount
    }

    public async getCaptchaChallenge(): Promise<GetCaptchaResponse> {
        try {
            const captchaChallenge = await this.providerApi.getCaptchaChallenge(this.userAccount, this.provider)
            this.verifyCaptchaChallengeContent(this.provider, captchaChallenge)
            return captchaChallenge
        } catch (e) {
            throw new ProsopoEnvError(e)
        }
    }

    public verifyCaptchaChallengeContent(provider: ProsopoRandomProvider, captchaChallenge: GetCaptchaResponse): void {
        // TODO make sure root is equal to root on the provider
        const proofLength = captchaChallenge.captchas[0].proof.length
        console.log(provider.provider)
        console.log(provider.datasetIdContent, captchaChallenge.captchas[0].proof[proofLength - 1][0])
        if (provider.datasetIdContent.toString() !== captchaChallenge.captchas[0].proof[proofLength - 1][0]) {
            throw new ProsopoEnvError('CAPTCHA.INVALID_DATASET_CONTENT_ID')
        }

        for (const captchaWithProof of captchaChallenge.captchas) {
            //TODO calculate the captchaId from the captcha content
            if (!verifyCaptchaData(captchaWithProof)) {
                throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE')
            }

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
        let tx: ContractSubmittableResult | undefined = undefined

        if (!this.web2) {
            try {
                tx = await this.contract.dappUserCommit(
                    this.dappAccount,
                    datasetId as string,
                    commitmentId,
                    this.provider.providerId.toString(),
                    this.userAccount
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
                this.contract.pair.address,
                salt,
                tx && tx.blockNumber ? tx.blockNumber.hash.toHex() : undefined,
                tx ? (tx.txHash ? tx.txHash.toString() : undefined) : undefined,
                this.web2,
                signature
            )
        } catch (err) {
            throw new ProsopoApiError(err)
        }

        let commitment: ProsopoCaptchaSolutionCommitment | undefined = undefined

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

/**
 * Verify the captcha data by hashing the images and checking the hashes correspond to the hashes passed in the captcha
 * Verify the captcha content id is present in the first layer of the proof
 * @param {CaptchaWithProof} captchaWithProof
 * @returns {boolean}
 */
async function verifyCaptchaData(captchaWithProof: CaptchaWithProof): Promise<boolean> {
    const captcha = captchaWithProof.captcha
    const proof = captchaWithProof.proof
    // Check that all the item hashes are equal to the provided item hashes in the captcha
    if (
        !(await Promise.all(captcha.items.map(async (item) => (await computeItemHash(item)).hash === item.hash))).every(
            (hash) => hash === true
        )
    ) {
        return false
    }
    // Check that the computed captcha content id is equal to the provided captcha content id
    const captchaHash = computeCaptchaHash(captcha, false, false, false)
    if (captchaHash !== captcha.captchaContentId) {
        return false
    }
    // Check that the captcha content id is present in the first layer of the proof
    return proof[0].indexOf(captchaHash) !== -1
}

export default ProsopoCaptchaApi
