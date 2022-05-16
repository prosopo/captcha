import { ICaptchaStateReducer } from "../types/client";
import { CaptchaSolutionResponse, GetCaptchaResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import { ProsopoCaptchaClient } from "./ProsopoCaptchaClient";


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
        const { captchaChallenge, currentCaptchaIndex, currentCaptchaSolution } = this.manager.state;

        const signer = this.context.getExtension().getExtension().signer;

        const currentCaptcha = captchaChallenge!.captchas[currentCaptchaIndex];
        const { captchaId, datasetId } = currentCaptcha.captcha;

        let submitResult: [CaptchaSolutionResponse, TransactionResponse] | Error;

        try {
            submitResult = await this.context.getCaptchaApi()!.submitCaptchaSolution(signer, captchaChallenge!.requestHash, captchaId, datasetId, currentCaptchaSolution);
        } catch (err) {
            submitResult = err as Error;
        }

        if (this.context.callbacks?.onSubmit) {
            this.context.callbacks.onSubmit(submitResult, this.manager.state);
        }

        this.manager.update({ currentCaptchaSolution: [] });

        if (submitResult instanceof Error) {
            return;
        }

        const nextCaptchaIndex = currentCaptchaIndex + 1;

        if (nextCaptchaIndex < captchaChallenge!.captchas.length) {
            this.manager.update({ currentCaptchaIndex: nextCaptchaIndex });
        } else {
            this.onSolved();
        }
    }

    // TODO check for solved captchas.
    public onSolved() {
        if (this.context.callbacks?.onSolved) {
            this.context.callbacks.onSolved();
        }
        this.dismissCaptcha();
    }

    public onChange(index: number) {
        const { currentCaptchaSolution } = this.manager.state;
        const captchaSolution = currentCaptchaSolution.includes(index) ? currentCaptchaSolution.filter(item => item !== index) : [...currentCaptchaSolution, index];

        if (this.context.callbacks?.onChange) {
            this.context.callbacks.onChange(captchaSolution);
        }

        this.manager.update({ currentCaptchaSolution: captchaSolution });
    }

    public dismissCaptcha() {
        this.manager.update({ captchaChallenge: undefined });
    }

}

export default ProsopoCaptchaStateClient;