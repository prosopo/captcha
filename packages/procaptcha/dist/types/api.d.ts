import { Captcha } from "@prosopo/contract";
export interface ProsopoRandomProviderResponse {
    providerId: string;
    blockNumber: string;
    provider: ProposoProvider;
}
export declare type ProsopoDappOperatorIsHumanUserResponse = boolean;
export interface ProposoProvider {
    balance: string;
    captchaDatasetId: string;
    fee: string;
    payee: string;
    serviceOrigin: string;
    status: string;
}
export interface CaptchaResponseCaptcha {
    captcha: Omit<Captcha, 'solution'>;
    proof: string[][];
}
export interface GetCaptchaResponse {
    captchas: CaptchaResponseCaptcha[];
    requestHash: string;
}
export interface CaptchaSolutionResponse {
    captchas: CaptchaResponseCaptcha[];
    status: string;
    partialFee: string;
}
export interface ProsopoCaptchaConfig {
    "providerApi.baseURL": string;
    "providerApi.prefix": string;
    "dappAccount": string;
    "dappUrl": string;
    "solutionThreshold": number;
    "web2": boolean;
    "prosopoContractAccount": string;
}
//# sourceMappingURL=api.d.ts.map