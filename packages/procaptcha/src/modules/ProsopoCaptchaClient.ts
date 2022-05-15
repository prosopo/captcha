import { ICaptchaManagerReducer, CaptchaEventCallbacks, TExtensionAccount, ICaptchaStatusReducer } from "../types/client";
import { ProsopoRandomProviderResponse } from "../types/api";

import ProsopoContract from "../api/ProsopoContract";
import { ProviderApi } from "../api/ProviderApi";
import { getProsopoContract } from "./contract";
import { getExtension } from "./extension";


export class ProsopoCaptchaClient {

    public manager: ICaptchaManagerReducer;
    public status: ICaptchaStatusReducer;
    public callbacks: CaptchaEventCallbacks | undefined;
    public providerApi: ProviderApi;

    constructor(manager: ICaptchaManagerReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager;
        this.status = status;
        this.callbacks = callbacks;
        this.providerApi = new ProviderApi(manager.state.config);
    }

    public onLoad() {
        const { extension, contract } = this.manager.state;

        if (!extension || !contract) {

            Promise.all([getExtension(), this.providerApi.getContractAddress()])
                .then(([extension, { contractAddress }]) => {

                    this.manager.update({ extension, contractAddress });

                    if (this.callbacks?.onLoad) {
                        this.callbacks.onLoad(extension, contractAddress);
                    }
                })
                .catch(err => {
                    throw new Error(err);
                });

            return;
        }

        this.manager.update({ contractAddress: contract.address });
    }

    public async onAccountChange(account: TExtensionAccount) {

        try {
            this.manager.state.extension!.setAccount(account.address);
        } catch (err) {
            throw new Error(err);
        }

        let contract: ProsopoContract;
        let provider: ProsopoRandomProviderResponse;

        try {
            contract = await getProsopoContract(this.manager.state.contractAddress!, this.manager.state.config['dappAccount'], account);
        } catch (err) {
            throw new Error(err);
        }

        try {
            provider = await contract.getRandomProvider(); // TODO how often should provider change?
        } catch (err) {
            throw new Error(err);
        }

        this.manager.update({ account, contract, provider });

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(account, contract, provider);
        }

    }

}

export default ProsopoCaptchaClient;
