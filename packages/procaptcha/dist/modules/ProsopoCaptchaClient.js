"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoCaptchaClient = void 0;
const contract_1 = require("./contract");
const extension_1 = require("./extension");
const ProviderApi_1 = require("../api/ProviderApi");
const ProsopoCaptchaApi_1 = require("./ProsopoCaptchaApi");
const contract_2 = require("@prosopo/contract");
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
        ProsopoCaptchaClient.extension = extension;
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
    async onLoad(createAccount) {
        if (!ProsopoCaptchaClient.extension) {
            try {
                ProsopoCaptchaClient.extension = await (0, extension_1.getExtension)(this.manager.state.config['web2']);
            }
            catch (err) {
                throw new contract_2.ProsopoEnvError(err);
            }
        }
        if (this.callbacks?.onLoad) {
            this.callbacks.onLoad(ProsopoCaptchaClient.extension, this.manager.state.config['prosopoContractAccount']);
            this.manager.update({ contractAddress: this.manager.state.config['prosopoContractAccount'] });
        }
        let account;
        if (createAccount) {
            try {
                account = await this.getExtension().createAccount();
            }
            catch (err) {
                throw new contract_2.ProsopoEnvError(err);
            }
        }
        else {
            try {
                account = await this.getExtension().getAccount();
            }
            catch (err) {
                throw new contract_2.ProsopoEnvError(err);
            }
        }
        await this.onAccountChange(account);
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
            throw new contract_2.ProsopoEnvError(err);
        }
        try {
            ProsopoCaptchaClient.contract = await (0, contract_1.getProsopoContract)(this.manager.state.config['prosopoContractAccount'], this.manager.state.config['dappAccount'], account, (0, contract_1.getWsProvider)(this.manager.state.config['dappUrl']));
        }
        catch (err) {
            throw new contract_2.ProsopoEnvError(err);
        }
        try {
            ProsopoCaptchaClient.provider = await ProsopoCaptchaClient.contract.getRandomProvider();
        }
        catch (err) {
            throw new contract_2.ProsopoEnvError(err);
        }
        ProsopoCaptchaClient.captchaApi = new ProsopoCaptchaApi_1.ProsopoCaptchaApi(ProsopoCaptchaClient.contract, ProsopoCaptchaClient.provider, this.providerApi, this.manager.state.config['web2']);
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