import HttpClientBase from "./HttpClientBase";
import { CaptchaSolutionResponse, GetCaptchaResponse, GetVerificationResponse, ProsopoCaptchaConfig, ProsopoRandomProviderResponse } from '../types';
import { CaptchaSolution } from "@prosopo/datasets";
export declare class ProviderApi extends HttpClientBase {
    private config;
    constructor(config: ProsopoCaptchaConfig, providerUrl: string);
    getProviders(): Promise<{
        accounts: string[];
    }>;
    getCaptchaChallenge(userAccount: string, randomProvider: ProsopoRandomProviderResponse): Promise<GetCaptchaResponse>;
    submitCaptchaSolution(captchas: CaptchaSolution[], requestHash: string, userAccount: string, salt: string, blockHash?: string, txHash?: string, web2?: boolean): Promise<CaptchaSolutionResponse>;
    verifySolution(userAccount: string, commitmentId: string): Promise<GetVerificationResponse>;
}
export default ProviderApi;
//# sourceMappingURL=ProviderApi.d.ts.map