import { ICaptchaStateReducer, TCaptchaSubmitResult } from "../types/client";
import { GetCaptchaResponse } from "../types/api";
import { ProsopoCaptchaClient } from "./ProsopoCaptchaClient";
import { CaptchaSolution } from "@prosopo/contract";
export declare class ProsopoCaptchaStateClient {
    context: ProsopoCaptchaClient;
    manager: ICaptchaStateReducer;
    constructor(context: ProsopoCaptchaClient, manager: ICaptchaStateReducer);
    onLoadCaptcha(): Promise<void>;
    onCancel(): void;
    onSubmit(): Promise<void>;
    onSolved(submitResult: TCaptchaSubmitResult): Promise<void>;
    onChange(hash: string): void;
    dismissCaptcha(): void;
    parseSolution(captchaChallenge: GetCaptchaResponse, captchaSolution: string[][]): CaptchaSolution[];
}
export default ProsopoCaptchaStateClient;
//# sourceMappingURL=ProsopoCaptchaStateClient.d.ts.map