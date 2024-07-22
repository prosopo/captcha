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
import { CaptchaResponseBody } from '../provider/index.js'
import { CaptchaSolution } from '../datasets/index.js'
import { IProsopoCaptchaContract } from '../contract/index.js'
import { ProviderApiInterface } from '../api/index.js'
import { Signer } from '@polkadot/api/types'
import { TCaptchaSubmitResult } from './client.js'
import { RandomProvider } from './manager.js'

export interface ProsopoCaptchaApiInterface {
    userAccount: string
    contract: IProsopoCaptchaContract | string
    provider: RandomProvider
    providerApi: ProviderApiInterface
    dappAccount: string
    web2: boolean
    getCaptchaChallenge(): Promise<CaptchaResponseBody>
    submitCaptchaSolution(
        signer: Signer,
        requestHash: string,
        solutions: CaptchaSolution[],
        salt: string,
        timestamp: string,
        signedTimestamp: string
    ): Promise<TCaptchaSubmitResult>
}
