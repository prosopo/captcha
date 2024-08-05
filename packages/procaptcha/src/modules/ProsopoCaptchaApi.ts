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
import { CaptchaMerkleTree, computeCaptchaSolutionHash } from '@prosopo/datasets'
import type {
    CaptchaResponseBody,
    CaptchaSolution,
    CaptchaSolutionResponse,
    ProsopoCaptchaApiInterface,
    RandomProvider,
} from '@prosopo/types'
import type { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { ProsopoDatasetError, ProsopoEnvError } from '@prosopo/common'
import type { ProviderApi } from '@prosopo/api'
import type { Signer } from '@polkadot/api/types'
import type { TCaptchaSubmitResult } from '@prosopo/types'
import { stringToHex } from '@polkadot/util/string'

export class ProsopoCaptchaApi implements ProsopoCaptchaApiInterface {
    userAccount: string
    contract: string
    provider: RandomProvider
    providerApi: ProviderApi
    dappAccount: string
    _web2: boolean

    constructor(
        userAccount: string,
        contract: string,
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
            // convert https/http to match page
            captchaChallenge.captchas.forEach((captcha) => {
                captcha.items.forEach((item) => {
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

    public async submitCaptchaSolution(
        signer: Signer,
        requestHash: string,
        solutions: CaptchaSolution[],
        salt: string,
        timestamp: string,
        timestampSignature: string
    ): Promise<TCaptchaSubmitResult> {
        const tree = new CaptchaMerkleTree()

        const captchasHashed = solutions.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root?.hash

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
                this.userAccount,
                salt,
                timestamp,
                timestampSignature,
                signature
            )
        } catch (error) {
            throw new ProsopoDatasetError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE', { context: { error } })
        }

        return [result, commitmentId, tx]
    }
}

export default ProsopoCaptchaApi
