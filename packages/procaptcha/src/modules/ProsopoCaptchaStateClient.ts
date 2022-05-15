import { ICaptchaStateReducer } from "../types/client";
import { ProsopoRandomProviderResponse, CaptchaSolutionResponse, GetCaptchaResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import { ProsopoContract } from "../api/ProsopoContract";
import { ProsopoCaptcha } from "./ProsopoCaptcha";
import { ProsopoCaptchaClient } from "./ProsopoCaptchaClient";


export class ProsopoCaptchaStateClient {

    public context: ProsopoCaptchaClient;
    public manager: ICaptchaStateReducer;

    constructor(context: ProsopoCaptchaClient, manager: ICaptchaStateReducer) {
        this.context = context;
        this.manager = manager;
    }

    public async onLoadCaptcha() {
        const { contract, provider } = this.context.manager.state;

        if (!contract || !provider) {
            return;
        }

        if (this.context.callbacks?.onBeforeLoadCaptcha) {
            this.context.callbacks.onBeforeLoadCaptcha(contract, provider);
        }

        let captchaChallenge: GetCaptchaResponse;
        const proCaptcha = new ProsopoCaptcha(contract, provider, this.context.providerApi);

        try {
            captchaChallenge = await proCaptcha.getCaptchaChallenge();
        } catch (err) {
            throw new Error(err);
        }

        this.manager.update({ captchaChallenge, currentCaptchaIndex: 0 });

        if (this.context.callbacks?.onLoadCaptcha) {
            this.context.callbacks.onLoadCaptcha(captchaChallenge);
        }
    }

    public onCancel() {
        if (this.context.callbacks?.onCancel) {
            this.context.callbacks.onCancel();
        }
        this.dismissCaptcha();
    }

    public async onSubmit() {
        const { extension, contract, provider } = this.context.manager.state;
        const { captchaChallenge, currentCaptchaIndex, currentCaptchaSolution } = this.manager.state;

        if (!captchaChallenge || !extension || !contract || !provider) {
            return;
        }

        const signer = extension.getInjectedExtension().signer;
        const proCaptcha = new ProsopoCaptcha(contract, provider, this.context.providerApi);
        const currentCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
        const { captchaId, datasetId } = currentCaptcha.captcha;

        let submitResult: [CaptchaSolutionResponse, TransactionResponse] | Error;

        try {
            submitResult = await proCaptcha.solveCaptchaChallenge(signer, captchaChallenge.requestHash, captchaId, datasetId, currentCaptchaSolution);
        } catch (err) {
            submitResult = err as Error;
        }

        if (this.context.callbacks?.onSubmit) {
            this.context.callbacks.onSubmit(submitResult, this.manager.state);
        }

        this.manager.update({ currentCaptchaSolution: [] });

        const nextCaptchaIndex = currentCaptchaIndex + 1;

        if (nextCaptchaIndex < captchaChallenge.captchas.length) {
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

        this.manager.update({ currentCaptchaSolution: captchaSolution });

        if (this.context.callbacks?.onChange) {
            this.context.callbacks.onChange(captchaSolution);
        }
    }

    public dismissCaptcha() {
        this.manager.update({ captchaChallenge: undefined });
    }

}

export default ProsopoCaptchaStateClient;