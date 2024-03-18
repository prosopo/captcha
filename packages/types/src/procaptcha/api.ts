import { CaptchaResponseBody } from '../provider/index.js'
import { CaptchaSolution } from '../datasets/index.js'
import { IProsopoCaptchaContract } from '../contract/interface.js'
import { ProviderApiInterface } from '../api/index.js'
import { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { Signer } from '@polkadot/api/types'
import { TCaptchaSubmitResult } from './client.js'

export interface ProsopoCaptchaApiInterface {
    userAccount: string
    contract: IProsopoCaptchaContract
    provider: RandomProvider
    providerApi: ProviderApiInterface
    dappAccount: string
    web2: boolean
    getCaptchaChallenge(): Promise<CaptchaResponseBody>
    verifyCaptchaChallengeContent(provider: RandomProvider, captchaChallenge: CaptchaResponseBody): void
    submitCaptchaSolution(
        signer: Signer,
        requestHash: string,
        datasetId: string,
        solutions: CaptchaSolution[],
        salt: string
    ): Promise<TCaptchaSubmitResult>
}
