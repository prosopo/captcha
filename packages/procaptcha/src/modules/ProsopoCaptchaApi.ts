// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import {
    CaptchaResponseBody,
    CaptchaSolution,
    CaptchaSolutionResponse,
    CaptchaWithProof,
    ProsopoCaptchaApiInterface,
} from '@prosopo/types'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ProsopoDatasetError, ProsopoEnvError } from '@prosopo/common'
import { ProviderApi } from '@prosopo/api'
import { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { Signer } from '@polkadot/api/types'
import { TCaptchaSubmitResult } from '@prosopo/types'
import { at } from '@prosopo/util'
import { stringToHex } from '@polkadot/util/string'

export class ProsopoCaptchaApi implements ProsopoCaptchaApiInterface {
    userAccount: string
    contract: ProsopoCaptchaContract
    provider: RandomProvider
    providerApi: ProviderApi
    dappAccount: string
    _web2: boolean

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
        this._web2 = web2
        this.dappAccount = dappAccount
    }

    get web2(): boolean {
        return this._web2
    }

    public async getCaptchaChallenge(): Promise<CaptchaResponseBody> {
        try {
            const captchaChallenge = await this.providerApi.getCaptchaChallenge(this.userAccount, this.provider)
            console.log('captchaChallenge', captchaChallenge)
            this.verifyCaptchaChallengeContent(this.provider, captchaChallenge)
            // convert https/http to match page
            captchaChallenge.captchas.forEach((captcha) => {
                captcha.captcha.items.forEach((item) => {
                    if (item.data) {
                        // drop the 'http(s):' prefix, leaving '//'. The '//' will autodetect http/https from the page load type
                        // https://stackoverflow.com/a/18320348/7215926
                        item.data = item.data.replace(/^http(s)*:\/\//, '//')
                    }
                })
            })

            return captchaChallenge
        } catch (error) {
            throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE', { context: { error } })
        }
    }

    public verifyCaptchaChallengeContent(provider: RandomProvider, captchaChallenge: CaptchaResponseBody): void {
        // TODO make sure root is equal to root on the provider
        const first = at(captchaChallenge.captchas, 0)
        const proofLength = first.proof.length

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

        const tx: ContractSubmittableResult | undefined = undefined

        let signature: string | undefined = undefined

        if (!signer || !signer.signRaw) {
            throw new ProsopoEnvError('GENERAL.CANT_FIND_KEYRINGPAIR', {
                context: { error: 'Signer is not defined, cannot sign message to prove account ownership' },
            })
        }

        let result: CaptchaSolutionResponse

        // sign the request hash to prove account ownership
        const signed = await signer.signRaw({
            address: this.userAccount,
            data: stringToHex(requestHash),
            type: 'bytes',
        })
        signature = signed.signature

        try {
            result = await this.providerApi.submitCaptchaSolution(
                solutions,
                requestHash,
                this.contract.pair.address,
                salt,
                signature
            )
        } catch (error) {
            throw new ProsopoDatasetError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE', { context: { error } })
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
