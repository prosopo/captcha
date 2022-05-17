import { ICaptchaStateReducer, TCaptchaSubmitResult } from "../types/client";
import { CaptchaSolution, CaptchaSolutionResponse, GetCaptchaResponse } from "../types/api";
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
        const { captchaChallenge, currentCaptchaIndex, currentCaptchaSolution } = this.manager.state;

        const nextCaptchaIndex = currentCaptchaIndex + 1;

        if (nextCaptchaIndex < captchaChallenge!.captchas.length) { 
            currentCaptchaSolution[nextCaptchaIndex] = [];
            this.manager.update({ currentCaptchaIndex: nextCaptchaIndex, currentCaptchaSolution });
            
            return;
        }

        const signer = this.context.getExtension().getExtension().signer;

        const currentCaptcha = captchaChallenge!.captchas[currentCaptchaIndex];
        const { datasetId } = currentCaptcha.captcha; // TODO arbitrary datasetId? Could datasetId be moved up next to requestHash?

        const solutions = this.parseSolutions(captchaChallenge!, currentCaptchaSolution);

        let submitResult: TCaptchaSubmitResult | Error;

        try {
            submitResult = await this.context.getCaptchaApi()!.submitCaptchaSolution(signer, captchaChallenge!.requestHash, datasetId!, solutions);
        } catch (err) {
            submitResult = err as Error;
        }

        if (this.context.callbacks?.onSubmit) {
            this.context.callbacks.onSubmit(submitResult, this.manager.state);
        }

        this.manager.update({currentCaptchaSolution: []});

        if (submitResult instanceof Error) {
            // TODO onFail?
            return;
        }

        // const [result, tx, commitment] = submitResult;

        await this.onSolved(submitResult);
    }

    // TODO check for solved captchas.
    public async onSolved(submitResult: TCaptchaSubmitResult) {
        if (this.context.callbacks?.onSolved) {
            this.context.callbacks.onSolved(submitResult);
        }
        this.dismissCaptcha();
    }

    public onChange(index: number) {
        const { currentCaptchaIndex, currentCaptchaSolution } = this.manager.state;

        let currentSolution: number[] = currentCaptchaSolution[currentCaptchaIndex] || [];
        currentSolution = currentSolution.includes(index) ? currentSolution.filter(item => item !== index) as number[] : [...currentSolution, index];
        
        currentCaptchaSolution[currentCaptchaIndex] = currentSolution;

        if (this.context.callbacks?.onChange) {
            this.context.callbacks.onChange(currentCaptchaSolution, currentCaptchaIndex);
        }

        this.manager.update({ currentCaptchaSolution });
    }

    public dismissCaptcha() {
        this.manager.update({ captchaChallenge: undefined });
    }

    // TODO move to ProsopoContract/ProviderApi/Model?
    public parseSolutions(captchaChallenge: GetCaptchaResponse, currentCaptchaSolution: number[][] ): CaptchaSolution[] {
        const parsedSolutions: CaptchaSolution[] = [];

        for (const [index, challenge] of captchaChallenge!.captchas.entries()) {
            const solution = currentCaptchaSolution[index] || [];
            challenge.captcha.solution = solution;
            parsedSolutions[index] = convertCaptchaToCaptchaSolution(challenge.captcha);
        }

        console.log("CAPTCHA SOLUTIONS", parsedSolutions);

        return parsedSolutions;
    }

}

export default ProsopoCaptchaStateClient;
