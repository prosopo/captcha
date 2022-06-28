"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoCaptchaClient = void 0;
const contract_1 = require("./contract");
const extension_1 = require("./extension");
const ProviderApi_1 = require("../api/ProviderApi");
const ProsopoCaptchaApi_1 = require("./ProsopoCaptchaApi");
// import { Extension } from "../api";
class ProsopoCaptchaClient {
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
        this.providerApi = new ProviderApi_1.ProviderApi(manager.state.config);
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
                [ProsopoCaptchaClient.extension, { contractAddress }] = await Promise.all([(0, extension_1.getExtension)(), this.providerApi.getContractAddress()]);
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
            ProsopoCaptchaClient.contract = await (0, contract_1.getProsopoContract)(this.manager.state.contractAddress, this.manager.state.config['dappAccount'], account, (0, contract_1.getWsProvider)(this.manager.state.config['dappUrl']));
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
        ProsopoCaptchaClient.captchaApi = new ProsopoCaptchaApi_1.ProsopoCaptchaApi(ProsopoCaptchaClient.contract, ProsopoCaptchaClient.provider, this.providerApi);
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
exports.ProsopoCaptchaClient = ProsopoCaptchaClient;
exports.default = ProsopoCaptchaClient;
//# sourceMappingURL=ProsopoCaptchaClient.js.map