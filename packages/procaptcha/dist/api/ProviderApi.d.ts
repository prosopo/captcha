import HttpClientBase from "./HttpClientBase";
import { ProsopoCaptchaConfig, ProsopoRandomProviderResponse, GetCaptchaResponse, CaptchaSolution, CaptchaSolutionResponse } from '../types';
export declare class ProviderApi extends HttpClientBase {
    private config;
    constructor(config: ProsopoCaptchaConfig);
    /**
   *
   * @deprecated use ProsopoContract$getRandomProvider instead.
   */
    getRandomProvider(): Promise<import("axios").AxiosResponse<any, any>>;
    getProviders(): Promise<{
        accounts: string[];
    }>;
    getContractAddress(): Promise<{
        contractAddress: string;
    }>;
    getCaptchaChallenge(randomProvider: ProsopoRandomProviderResponse): Promise<GetCaptchaResponse>;
    submitCaptchaSolution(blockHash: string, captchas: CaptchaSolution[], requestHash: string, txHash: string, userAccount: string): Promise<CaptchaSolutionResponse>;
}
export default ProviderApi;
//# sourceMappingURL=ProviderApi.d.ts.map