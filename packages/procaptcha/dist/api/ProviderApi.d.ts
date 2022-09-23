import HttpClientBase from "./HttpClientBase";
import { ProsopoCaptchaConfig, ProsopoRandomProviderResponse, GetCaptchaResponse, CaptchaSolutionResponse } from '../types';
import { CaptchaSolution } from "@prosopo/contract";
export declare class ProviderApi extends HttpClientBase {
    private config;
    constructor(config: ProsopoCaptchaConfig);
    getProviders(): Promise<{
        accounts: string[];
    }>;
    getContractAddress(): Promise<{
        contractAddress: string;
    }>;
    getCaptchaChallenge(randomProvider: ProsopoRandomProviderResponse): Promise<GetCaptchaResponse>;
    submitCaptchaSolution(captchas: CaptchaSolution[], requestHash: string, userAccount: string, salt: string, blockHash?: string, txHash?: string, web2?: boolean): Promise<CaptchaSolutionResponse>;
}
export default ProviderApi;
//# sourceMappingURL=ProviderApi.d.ts.map