import { ICaptchaManagerReducer, CaptchaEventCallbacks, TExtensionAccount, ICaptchaStatusReducer } from "../types/client";
import { ProsopoRandomProviderResponse } from "../types/api";

import { ProsopoContract } from "../api/ProsopoContract";
import { getProsopoContract } from "./contract";
import { getExtension } from "./extension";
import { ProviderApi } from "../api/ProviderApi";
import { ProsopoCaptchaApi } from "./ProsopoCaptchaApi";
import { Extension } from "../api";


export class ProsopoCaptchaClient {

    public manager: ICaptchaManagerReducer;
    public status: ICaptchaStatusReducer;
    public callbacks: CaptchaEventCallbacks | undefined;
    private providerApi: ProviderApi;

    private static extension: Extension;
    private static contract: ProsopoContract;
    private static provider: ProsopoRandomProviderResponse;
    private static captchaApi: ProsopoCaptchaApi;

    constructor(manager: ICaptchaManagerReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager;
        this.status = status;
        this.callbacks = callbacks;
        this.providerApi = new ProviderApi(manager.state.config);
    }

    public getProviderApi() {
        return this.providerApi;
    }

    public getExtension() {
        return ProsopoCaptchaClient.extension;
    }

    public getContract() {
        return ProsopoCaptchaClient.contract;
    }

    public getProvider() {
        return ProsopoCaptchaClient.provider;
    }

    public getCaptchaApi() {
        return ProsopoCaptchaClient.captchaApi;
    }

    public onLoad() {
        if (!this.getExtension() || !this.getContract()) {

            Promise.all([getExtension(), this.providerApi.getContractAddress()])
                .then(([extension, { contractAddress }]) => {

                    ProsopoCaptchaClient.extension = extension;

                    if (this.callbacks?.onLoad) {
                        this.callbacks.onLoad(contractAddress);
                    }

                    this.manager.update({ contractAddress });
                })
                .catch(err => {
                    throw new Error(err);
                });

            return;
        }

        this.manager.update({ contractAddress: this.getContract().address });
    }

    public async onAccountChange(account: TExtensionAccount) {
        try {
            this.getExtension().setAccount(account.address);
        } catch (err) {
            throw new Error(err);
        }

        try {
            ProsopoCaptchaClient.contract = await getProsopoContract(this.manager.state.contractAddress!, this.manager.state.config['dappAccount'], account);
        } catch (err) {
            throw new Error(err);
        }

        try {
            ProsopoCaptchaClient.provider = await ProsopoCaptchaClient.contract.getRandomProvider(); // TODO how often should provider change?
        } catch (err) {
            throw new Error(err);
        }

        ProsopoCaptchaClient.captchaApi = new ProsopoCaptchaApi(ProsopoCaptchaClient.contract, ProsopoCaptchaClient.provider, this.providerApi);

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(account, ProsopoCaptchaClient.contract, ProsopoCaptchaClient.provider);
        }

        this.manager.update({ account });
    }

}

export default ProsopoCaptchaClient;
