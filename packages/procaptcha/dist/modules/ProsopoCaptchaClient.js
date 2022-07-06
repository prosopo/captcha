import { getProsopoContract } from "./contract";
import { getExtension } from "./extension";
import { ProviderApi } from "../api/ProviderApi";
import { ProsopoCaptchaApi } from "./ProsopoCaptchaApi";
// import { Extension } from "../api";
export class ProsopoCaptchaClient {
    manager;
    status;
    callbacks;
    providerApi;
    static extension;
    static contract;
    static provider;
    static captchaApi;
    constructor(manager, status, callbacks) {
        this.manager = manager;
        this.status = status;
        this.callbacks = callbacks;
        this.providerApi = new ProviderApi(manager.state.config);
    }
    getExtension() {
        return ProsopoCaptchaClient.extension;
    }
    setExtension(extension) {
        return ProsopoCaptchaClient.extension = extension;
    }
    getContract() {
        return ProsopoCaptchaClient.contract;
    }
    getProvider() {
        return ProsopoCaptchaClient.provider;
    }
    getCaptchaApi() {
        return ProsopoCaptchaClient.captchaApi;
    }
    async onLoad() {
        let contractAddress = ProsopoCaptchaClient.contract?.address;
        if (!ProsopoCaptchaClient.extension || !contractAddress) {
            try {
                [ProsopoCaptchaClient.extension, { contractAddress }] = await Promise.all([getExtension(), this.providerApi.getContractAddress()]);
            }
            catch (err) {
                throw new Error(err);
            }
        }
        if (this.callbacks?.onLoad) {
            this.callbacks.onLoad(ProsopoCaptchaClient.extension, contractAddress);
        }
        this.manager.update({ contractAddress });
    }
    async onAccountChange(account) {
        if (!account) {
            this.onAccountUnset();
            return;
        }
        try {
            ProsopoCaptchaClient.extension.setAccount(account.address);
        }
        catch (err) {
            throw new Error(err);
        }
        try {
            ProsopoCaptchaClient.contract = await getProsopoContract(this.manager.state.contractAddress, this.manager.state.config['dappAccount'], account);
        }
        catch (err) {
            throw new Error(err);
        }
        try {
            ProsopoCaptchaClient.provider = await ProsopoCaptchaClient.contract.getRandomProvider(); // TODO how often should provider change?
        }
        catch (err) {
            throw new Error(err);
        }
        ProsopoCaptchaClient.captchaApi = new ProsopoCaptchaApi(ProsopoCaptchaClient.contract, ProsopoCaptchaClient.provider, this.providerApi);
        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(account);
        }
        this.manager.update({ account });
    }
    onAccountUnset() {
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
//# sourceMappingURL=ProsopoCaptchaClient.js.map