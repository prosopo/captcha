"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoCaptchaStateClient = void 0;
const contract_1 = require("@prosopo/contract");
class ProsopoCaptchaStateClient {
    context;
    manager;
    constructor(context, manager) {
        this.context = context;
        this.manager = manager;
    }
    async onLoadCaptcha() {
        let captchaChallenge;
        try {
            captchaChallenge = await this.context.getCaptchaApi().getCaptchaChallenge();
        }
        catch (err) {
            captchaChallenge = err;
        }
        if (this.context.callbacks?.onLoadCaptcha) {
            this.context.callbacks.onLoadCaptcha(captchaChallenge);
        }
        if (captchaChallenge instanceof Error) {
            captchaChallenge = undefined;
        }
        this.manager.update({ captchaChallenge, captchaIndex: 0 });
    }
    onCancel() {
        if (this.context.callbacks?.onCancel) {
            this.context.callbacks.onCancel();
        }
        this.dismissCaptcha();
    }
    async onSubmit() {
        const { captchaChallenge, captchaIndex, captchaSolution } = this.manager.state;
        const nextCaptchaIndex = captchaIndex + 1;
        if (nextCaptchaIndex < captchaChallenge.captchas.length) {
            captchaSolution[nextCaptchaIndex] = [];
            this.manager.update({ captchaIndex: nextCaptchaIndex, captchaSolution });
            return;
        }
        const signer = this.context.getExtension().getExtension().signer;
        const currentCaptcha = captchaChallenge.captchas[captchaIndex];
        const { datasetId } = currentCaptcha.captcha; // TODO arbitrary datasetId? Could datasetId be moved up next to requestHash?
        const solutions = this.parseSolution(captchaChallenge, captchaSolution);
        let submitResult;
        try {
            submitResult = await this.context.getCaptchaApi().submitCaptchaSolution(signer, captchaChallenge.requestHash, datasetId, solutions);
        }
        catch (err) {
            submitResult = err;
        }
        if (this.context.callbacks?.onSubmit) {
            this.context.callbacks.onSubmit(submitResult, this.manager.state);
        }
        this.manager.update({ captchaSolution: [] });
        if (submitResult instanceof Error) {
            // TODO onFail?
            return;
        }
        await this.onSolved(submitResult);
    }
    // TODO check for solved captchas.
    async onSolved(submitResult) {
        this.dismissCaptcha();
        const isHuman = await this.context.getContract()?.dappOperatorIsHumanUser(this.context.solutionThreshold);
        if (isHuman) {
            if (this.context.callbacks?.onSolved) {
                this.context.callbacks.onSolved(submitResult);
            }
        }
        else {
            this.context.status.update({ info: ["onSolved:", `Captcha threshold not met. Please solve more captchas.`] });
            await this.onLoadCaptcha();
        }
    }
    onChange(index) {
        const { captchaIndex, captchaSolution } = this.manager.state;
        let currentSolution = captchaSolution[captchaIndex] || [];
        currentSolution = currentSolution.includes(index) ? currentSolution.filter(item => item !== index) : [...currentSolution, index];
        captchaSolution[captchaIndex] = currentSolution;
        if (this.context.callbacks?.onChange) {
            this.context.callbacks.onChange(captchaSolution, captchaIndex);
        }
        this.manager.update({ captchaSolution });
    }
    dismissCaptcha() {
        this.manager.update({ captchaChallenge: undefined });
    }
    // TODO move to ProsopoContract/ProviderApi/Model?
    parseSolution(captchaChallenge, captchaSolution) {
        const parsedSolution = [];
        for (const [index, challenge] of captchaChallenge.captchas.entries()) {
            const solution = captchaSolution[index] || [];
            challenge.captcha.solution = solution;
            parsedSolution[index] = (0, contract_1.convertCaptchaToCaptchaSolution)(challenge.captcha);
        }
        console.log("CAPTCHA SOLUTIONS", parsedSolution);
        return parsedSolution;
    }
}
exports.ProsopoCaptchaStateClient = ProsopoCaptchaStateClient;
exports.default = ProsopoCaptchaStateClient;
//# sourceMappingURL=ProsopoCaptchaStateClient.js.map