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
            captchaChallenge = await this.context.getCaptchaApi()?.getCaptchaChallenge();
        }
        catch (err) {
            captchaChallenge = err;
            throw new contract_1.ProsopoEnvError(captchaChallenge);
        }
        if (this.context.callbacks?.onLoadCaptcha && captchaChallenge) {
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
        const signer = this.context.getExtension().getExtension()?.signer;
        const currentCaptcha = captchaChallenge.captchas[captchaIndex];
        const { datasetId } = currentCaptcha.captcha;
        const solutions = this.parseSolution(captchaChallenge, captchaSolution);
        let submitResult;
        if (signer) {
            try {
                submitResult = await this.context
                    .getCaptchaApi()
                    .submitCaptchaSolution(signer, captchaChallenge.requestHash, datasetId, solutions);
            }
            catch (err) {
                submitResult = err;
            }
            if (this.context.callbacks?.onSubmit) {
                this.context.callbacks.onSubmit(submitResult, this.manager.state);
            }
            this.manager.update({ captchaSolution: [] });
            if (submitResult instanceof Error) {
                return;
            }
            await this.onSolved(submitResult);
        }
        this.manager.update({ captchaSolution: [] });
    }
    async onSolved(submitResult) {
        let isHuman;
        try {
            isHuman = await this.context.getContract()?.dappOperatorIsHumanUser(this.context.manager.state.config['solutionThreshold']);
        }
        catch (err) {
            console.log("Error determining whether user is human");
        }
        this.dismissCaptcha();
        if (this.context.callbacks?.onSolved) {
            this.context.callbacks.onSolved(submitResult, isHuman);
        }
    }
    onChange(hash) {
        const { captchaIndex, captchaSolution } = this.manager.state;
        let currentSolution = captchaSolution[captchaIndex] || [];
        currentSolution = currentSolution.includes(hash) ? currentSolution.filter(item => item !== hash) : [...currentSolution, hash];
        captchaSolution[captchaIndex] = currentSolution;
        if (this.context.callbacks?.onChange) {
            this.context.callbacks.onChange(captchaSolution, captchaIndex);
        }
        this.manager.update({ captchaSolution });
    }
    dismissCaptcha() {
        this.manager.update({ captchaChallenge: undefined });
    }
    parseSolution(captchaChallenge, captchaSolution) {
        const parsedSolution = [];
        for (const [index, challenge] of captchaChallenge.captchas.entries()) {
            const solution = captchaSolution[index] || [];
            // challenge.captcha.solution = solution;
            parsedSolution[index] = (0, contract_1.convertCaptchaToCaptchaSolution)({ ...challenge.captcha, solution });
        }
        console.log("CAPTCHA SOLUTIONS", parsedSolution);
        return parsedSolution;
    }
}
exports.ProsopoCaptchaStateClient = ProsopoCaptchaStateClient;
exports.default = ProsopoCaptchaStateClient;
//# sourceMappingURL=ProsopoCaptchaStateClient.js.map