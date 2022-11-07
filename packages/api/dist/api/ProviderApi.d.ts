import HttpClientBase from './HttpClientBase';
import { CaptchaSolutionResponse, GetCaptchaResponse, GetVerificationResponse, ProsopoNetwork, ProsopoRandomProviderResponse } from '../types';
import { CaptchaSolution } from '@prosopo/datasets';
export declare class ProviderApi extends HttpClientBase {
    private network;
    constructor(network: ProsopoNetwork, providerUrl: string);
    getProviders(): Promise<{
        accounts: string[];
    }>;
    getCaptchaChallenge(userAccount: string, randomProvider: ProsopoRandomProviderResponse): Promise<GetCaptchaResponse>;
    submitCaptchaSolution(captchas: CaptchaSolution[], requestHash: string, userAccount: string, salt: string, blockHash?: string, txHash?: string, web2?: boolean): Promise<CaptchaSolutionResponse>;
    verifySolution(userAccount: string, commitmentId: string): Promise<GetVerificationResponse>;
}
export default ProviderApi;
//# sourceMappingURL=ProviderApi.d.ts.map