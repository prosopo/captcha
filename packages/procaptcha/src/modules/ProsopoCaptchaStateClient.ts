import { ICaptchaStateReducer } from "../types/client";
import { CaptchaSolutionResponse, GetCaptchaResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import { ProsopoCaptchaClient } from "./ProsopoCaptchaClient";
import {convertCaptchaToCaptchaSolution} from "@prosopo/provider";


export class ProsopoCaptchaStateClient {

    public context: ProsopoCaptchaClient;
    public manager: ICaptchaStateReducer;

    constructor(context: ProsopoCaptchaClient, manager: ICaptchaStateReducer) {
        this.context = context;
        this.manager = manager;
    }

    public async onLoadCaptcha() {
        let captchaChallenge: GetCaptchaResponse | Error | undefined;

        try {
            captchaChallenge = await this.context.getCaptchaApi()!.getCaptchaChallenge();
        } catch (err) {
            captchaChallenge = err as Error;
        }

        if (this.context.callbacks?.onLoadCaptcha) {
            this.context.callbacks.onLoadCaptcha(captchaChallenge);
        }

        if (captchaChallenge instanceof Error) {
            captchaChallenge = undefined;
        }

        this.manager.update({ captchaChallenge, currentCaptchaIndex: 0 });
    }

    public onCancel() {
        if (this.context.callbacks?.onCancel) {
            this.context.callbacks.onCancel();
        }
        this.dismissCaptcha();
    }

    public async onSubmit() {
        const { captchaChallenge, currentCaptchaIndex, captchaSolutions } = this.manager.state;

        const nextCaptchaIndex = currentCaptchaIndex + 1;
        console.log("nextCaptchaIndex", nextCaptchaIndex);
        if (nextCaptchaIndex === captchaChallenge!.captchas.length) {

            const signer = this.context.getExtension().getInjectedExtension().signer;

            const currentCaptcha = captchaChallenge!.captchas[currentCaptchaIndex];
            const datasetId = currentCaptcha.captcha.datasetId || '';

            let submitResult: [CaptchaSolutionResponse, TransactionResponse, string] | Error;

            try {
                submitResult = await this.context.getCaptchaApi().solveCaptchaChallenge(signer, captchaChallenge!.requestHash, datasetId, captchaSolutions);
            } catch (err) {
                submitResult = err as Error;
            }

            if (this.context.callbacks?.onSubmit) {
                this.context.callbacks.onSubmit(submitResult, this.manager.state);
            }

            this.manager.update({currentCaptchaSolution: []});

            if (submitResult instanceof Error) {
                return;
            }
            console.log("submitResult", submitResult[0]);

            const [_solutionResponse, _txResponse, commitmentId] = submitResult;

            await this.onSolved(commitmentId);
        } else {
            this.manager.update({currentCaptchaIndex: nextCaptchaIndex});
            this.manager.update({currentCaptchaSolution: []});
        }
    }

    // TODO check for solved captchas.
    public async onSolved(commitmentId) {
        const commitment = await this.context.getContract().getCaptchaSolutionCommitment(commitmentId)
        if (this.context.callbacks?.onSolved) {
            this.context.callbacks.onSolved(commitment);
        }
        this.dismissCaptcha();
    }

    public onChange(index: number) {
        const { currentCaptchaSolution } = this.manager.state;
        const captchaSolution = currentCaptchaSolution.includes(index) ? currentCaptchaSolution.filter(item => item !== index) : [...currentCaptchaSolution, index];
        this.buildSolutions(captchaSolution);
        if (this.context.callbacks?.onChange) {
            this.context.callbacks.onChange(captchaSolution);
        }

        this.manager.update({ currentCaptchaSolution: captchaSolution });
    }

    public buildSolutions(_captchaSolution: number[]) {
        const { captchaChallenge, currentCaptchaIndex, captchaSolutions } = this.manager.state;
        if (captchaChallenge && "captchas" in captchaChallenge) {
            const solvedCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
            solvedCaptcha.captcha.solution = _captchaSolution
            let _captchaSolutions = [...captchaSolutions]
            _captchaSolutions[currentCaptchaIndex] = convertCaptchaToCaptchaSolution(solvedCaptcha.captcha);
            console.log("SOLVED CAPTCHA", solvedCaptcha.captcha);
            console.log("CAPTCHA SOLUTIONS", _captchaSolutions);
            this.manager.update({ captchaSolutions: _captchaSolutions });
        }
    }

    public dismissCaptcha() {
        this.manager.update({ captchaChallenge: undefined });
    }

}

export default ProsopoCaptchaStateClient;
