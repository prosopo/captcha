import { CaptchaSolution } from '@prosopo/contract';
import { Signer } from "@polkadot/api/types";
import { ProsopoRandomProviderResponse, GetCaptchaResponse } from "../types/api";
import ProviderApi from "../api/ProviderApi";
import ProsopoContract from "../api/ProsopoContract";
import { TCaptchaSubmitResult } from '../types/client';
export declare class ProsopoCaptchaApi {
    protected contract: ProsopoContract;
    protected provider: ProsopoRandomProviderResponse;
    protected providerApi: ProviderApi;
    constructor(contract: ProsopoContract, provider: ProsopoRandomProviderResponse, providerApi: ProviderApi);
    getCaptchaChallenge(): Promise<GetCaptchaResponse>;
    submitCaptchaSolution(signer: Signer, requestHash: string, datasetId: string, solutions: CaptchaSolution[]): Promise<TCaptchaSubmitResult>;
}
export default ProsopoCaptchaApi;
//# sourceMappingURL=ProsopoCaptchaApi.d.ts.map