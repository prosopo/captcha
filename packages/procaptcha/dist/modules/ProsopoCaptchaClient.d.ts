import { ICaptchaContextReducer, CaptchaEventCallbacks, TExtensionAccount, ICaptchaStatusReducer, IExtensionInterface } from "../types/client";
import { ProsopoRandomProviderResponse } from "../types/api";
import { ProsopoContract } from "../api/ProsopoContract";
import { ProviderApi } from "../api/ProviderApi";
import { ProsopoCaptchaApi } from "./ProsopoCaptchaApi";
export declare class ProsopoCaptchaClient {
    manager: ICaptchaContextReducer;
    status: ICaptchaStatusReducer;
    callbacks: CaptchaEventCallbacks | undefined;
    providerApi: ProviderApi;
    solutionThreshold: number;
    private static extension;
    private static contract;
    private static provider;
    private static captchaApi;
    constructor(manager: ICaptchaContextReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks);
    getExtension(): IExtensionInterface;
    setExtension(extension: IExtensionInterface): IExtensionInterface;
    getContract(): ProsopoContract | undefined;
    getProvider(): ProsopoRandomProviderResponse | undefined;
    getCaptchaApi(): ProsopoCaptchaApi | undefined;
    onLoad(): Promise<void>;
    onAccountChange(account?: TExtensionAccount): Promise<void>;
    onAccountUnset(): void;
}
export default ProsopoCaptchaClient;
//# sourceMappingURL=ProsopoCaptchaClient.d.ts.map