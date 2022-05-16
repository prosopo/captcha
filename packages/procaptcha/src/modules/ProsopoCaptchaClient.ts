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
    public providerApi: ProviderApi;

    private static extension: Extension;
    private static contract: ProsopoContract | undefined;
    private static provider: ProsopoRandomProviderResponse | undefined;
    private static captchaApi: ProsopoCaptchaApi | undefined;

    constructor(manager: ICaptchaManagerReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager;
        this.status = status;
        this.callbacks = callbacks;
        this.providerApi = new ProviderApi(manager.state.config);
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
                        this.callbacks.onLoad(extension, contractAddress);
                    }

                    this.manager.update({ contractAddress });
                })
                .catch(err => {
                    throw new Error(err);
                });

            return;
        }

        this.manager.update({ contractAddress: this.getContract()!.address });
    }

    public async onAccountChange(account?: TExtensionAccount) {
        if (!account) {
            this.onAccountUnset();
            return;
        }

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
            this.callbacks.onAccountChange(account);
        }

        this.manager.update({ account });
    }

    public onAccountUnset() {
        ProsopoCaptchaClient.contract = undefined;
        ProsopoCaptchaClient.provider = undefined;
        ProsopoCaptchaClient.captchaApi = undefined;

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(undefined);
        }

        this.manager.update({ account: undefined });
    }

}

export default ProsopoCaptchaClient;
