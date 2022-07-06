import { ICaptchaStateReducer, TCaptchaSubmitResult } from "../types/client";
import { CaptchaSolution, GetCaptchaResponse } from "../types/api";
import { ProsopoCaptchaClient } from "./ProsopoCaptchaClient";
export declare class ProsopoCaptchaStateClient {
    context: ProsopoCaptchaClient;
    manager: ICaptchaStateReducer;
    constructor(context: ProsopoCaptchaClient, manager: ICaptchaStateReducer);
    onLoadCaptcha(): Promise<void>;
    onCancel(): void;
    onSubmit(): Promise<void>;
    onSolved(submitResult: TCaptchaSubmitResult): Promise<void>;
    onChange(index: number): void;
    dismissCaptcha(): void;
    parseSolution(captchaChallenge: GetCaptchaResponse, captchaSolution: number[][]): CaptchaSolution[];
}
export default ProsopoCaptchaStateClient;
//# sourceMappingURL=ProsopoCaptchaStateClient.d.ts.map