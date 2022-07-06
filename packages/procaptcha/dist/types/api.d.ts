import { Captcha } from "@prosopo/contract";
export interface ProsopoRandomProviderResponse {
    providerId: string;
    blockNumber: string;
    provider: ProposoProvider;
}
export interface ProposoProvider {
    balance: string;
    captchaDatasetId: string;
    fee: string;
    payee: string;
    serviceOrigin: string;
    status: string;
}
export interface CaptchaImageSchema {
    path: string;
    type: string;
}
export interface CaptchaResponseCaptcha {
    captcha: Captcha;
    proof: string[][];
}
export interface GetCaptchaResponse {
    captchas: CaptchaResponseCaptcha[];
    requestHash: string;
}
export interface CaptchaSolution {
    captchaId: string;
    solution: number[];
    salt: string;
}
export interface CaptchaSolutionResponse {
    captchas: CaptchaResponseCaptcha[];
    status: string;
    partialFee: string;
}
export interface ProsopoCaptchaConfig {
    "providerApi.baseURL": string;
    "providerApi.prefix": string;
    dappAccount: string;
}
//# sourceMappingURL=api.d.ts.map