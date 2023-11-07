// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
    CaptchaMerkleTree,
    computeCaptchaHash,
    computeCaptchaSolutionHash,
    computeItemHash,
    verifyProof,
} from '@prosopo/datasets'
import { CaptchaSolution, CaptchaWithProof } from '@prosopo/types'
import { CaptchaSolutionResponse, GetCaptchaResponse } from '../types/api.js'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { ProsopoApiError } from '../api/handlers.js'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ProsopoEnvError } from '@prosopo/common'
import { ProviderApi } from '@prosopo/api'
import { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { Signer } from '@polkadot/api/types'
import { TCaptchaSubmitResult } from '../types/client.js'
import { at } from '@prosopo/util'
import { stringToHex } from '@polkadot/util/string'

export class ProsopoCaptchaApi {
    userAccount: string
    contract: ProsopoCaptchaContract
    provider: RandomProvider
    providerApi: ProviderApi
    dappAccount: string
    private web2: boolean

    constructor(
        userAccount: string,
        contract: ProsopoCaptchaContract,
        provider: RandomProvider,
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
            // TODO fix/improve error handling
            throw new ProsopoEnvError(e as Error)
        }
    }

    public verifyCaptchaChallengeContent(provider: RandomProvider, captchaChallenge: GetCaptchaResponse): void {
        // TODO make sure root is equal to root on the provider
        const first = at(captchaChallenge.captchas, 0)
        const proofLength = first.proof.length
        console.log(provider.provider)

        const last = at(first.proof, proofLength - 1)
        if (provider.provider.datasetIdContent.toString() !== at(last, 0)) {
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
        const tx: ContractSubmittableResult | undefined = undefined

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
                signature
            )
        } catch (err) {
            // TODO fix/improve error handling
            throw new ProsopoApiError(err as Response)
        }

        return [result, commitmentId, tx]
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
    return at(proof, 0).indexOf(captchaHash) !== -1
}

export default ProsopoCaptchaApi
