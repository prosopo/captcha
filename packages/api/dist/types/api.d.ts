import { Captcha } from "@prosopo/datasets";
export interface ProsopoRandomProviderResponse {
    providerId: string;
    blockNumber: string;
    provider: ProposoProvider;
}
export declare type ProsopoDappOperatorIsHumanUserResponse = boolean;
export interface ProposoProvider {
    balance: string;
    datasetId: string;
    datasetIdContent: string;
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
export interface GetVerificationResponse {
    status: string;
    solutionApproved: boolean;
}
export interface CaptchaSolutionResponse {
    captchas: CaptchaResponseCaptcha[];
    status: string;
    partialFee: string;
    solutionApproved: boolean;
}
export interface AccountCreatorConfig {
    "area": {
        width: number;
        height: number;
    };
    "offsetParameter": number;
    "multiplier": number;
    "fontSizeFactor": number;
    "maxShadowBlur": number;
    "numberOfRounds": number;
    "seed": number;
}
export interface ProsopoCaptchaConfig {
    "providerApi.prefix": string;
    "dappAccount": string;
    "dappUrl": string;
    "solutionThreshold": number;
    "web2": boolean;
    "prosopoContractAccount": string;
    "accountCreator": AccountCreatorConfig;
    "dappName": string;
    "serverUrl": string;
}
//# sourceMappingURL=api.d.ts.map