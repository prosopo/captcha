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
import { ICaptchaStateReducer, TCaptchaSubmitResult } from '../types/client'
import { GetCaptchaResponse } from '../types/api'

import { ProsopoCaptchaClient } from './ProsopoCaptchaClient'
import { ProsopoEnvError } from '@prosopo/contract'
import { CaptchaSolution, convertCaptchaToCaptchaSolution } from '@prosopo/datasets'

export class ProsopoCaptchaStateClient {
    public context: ProsopoCaptchaClient
    public manager: ICaptchaStateReducer

    constructor(context: ProsopoCaptchaClient, manager: ICaptchaStateReducer) {
        this.context = context
        this.manager = manager
    }

    public async onLoadCaptcha() {
        let captchaChallenge: GetCaptchaResponse | Error | undefined

        try {
            captchaChallenge = await this.context.captchaApi?.getCaptchaChallenge()
        } catch (err) {
            captchaChallenge = err as Error
            throw new ProsopoEnvError(captchaChallenge)
        }

        if (this.context.callbacks?.onLoadCaptcha && captchaChallenge) {
            this.context.callbacks.onLoadCaptcha(captchaChallenge)
        }

        if (captchaChallenge instanceof Error) {
            captchaChallenge = undefined
        }

        this.manager.update({ captchaChallenge, captchaIndex: 0 })
    }

    public onCancel() {
        if (this.context.callbacks?.onCancel) {
            this.context.callbacks.onCancel()
        }
        this.dismissCaptcha()
    }

    public async onSubmit() {
        const { captchaChallenge, captchaIndex, captchaSolution } = this.manager.state

        const nextCaptchaIndex = captchaIndex + 1

        if (!captchaChallenge) {
            throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE')
        }

        if (nextCaptchaIndex < captchaChallenge.captchas.length) {
            captchaSolution[nextCaptchaIndex] = []
            this.manager.update({ captchaIndex: nextCaptchaIndex, captchaSolution })

            return
        }

        const signer = this.context.extension.getExtension()?.signer

        const currentCaptcha = captchaChallenge.captchas[captchaIndex]
        const { datasetId } = currentCaptcha.captcha

        const solutions = this.parseSolution(captchaChallenge, captchaSolution)

        let submitResult: TCaptchaSubmitResult | Error

        if (signer) {
            try {
                submitResult = await this.context
                    .captchaApi!
                    .submitCaptchaSolution(signer, captchaChallenge.requestHash, datasetId!, solutions)
            } catch (err) {
                submitResult = err as Error
            }

            if (this.context.callbacks?.onSubmit) {
                this.context.callbacks.onSubmit(submitResult, this.manager.state)
            }

            this.manager.update({ captchaSolution: [] })

            if (submitResult instanceof Error) {
                return
            }

            await this.onSolved(submitResult)
        }
        this.manager.update({ captchaSolution: [] })
    }

    public async onSolved(submitResult: TCaptchaSubmitResult) {
        let isHuman: boolean | undefined
        try {
            isHuman = await this.context
                .contract
                ?.dappOperatorIsHumanUser(this.context.manager.state.config['solutionThreshold'])
        } catch (err) {
            console.log('Error determining whether user is human')
        }
        this.dismissCaptcha()
        if (this.context.callbacks?.onSolved) {
            this.context.callbacks.onSolved(submitResult, isHuman)
        }
    }

    public onChange(hash: string) {
        const { captchaIndex, captchaSolution } = this.manager.state

        let currentSolution: string[] = captchaSolution[captchaIndex] || []
        currentSolution = currentSolution.includes(hash)
            ? currentSolution.filter((item) => item !== hash)
            : [...currentSolution, hash]

        captchaSolution[captchaIndex] = currentSolution

        if (this.context.callbacks?.onChange) {
            this.context.callbacks.onChange(captchaSolution, captchaIndex)
        }

        this.manager.update({ captchaSolution })
    }

    public dismissCaptcha() {
        this.manager.update({ captchaChallenge: undefined })
    }

    public parseSolution(captchaChallenge: GetCaptchaResponse, captchaSolution: string[][]): CaptchaSolution[] {
        const parsedSolution: CaptchaSolution[] = []

        for (const [index, challenge] of captchaChallenge!.captchas.entries()) {
            const solution = captchaSolution[index] || []
            // challenge.captcha.solution = solution;
            parsedSolution[index] = convertCaptchaToCaptchaSolution({ ...challenge.captcha, solution })
        }

        console.log('CAPTCHA SOLUTIONS', parsedSolution)

        return parsedSolution
    }
}

export default ProsopoCaptchaStateClient
