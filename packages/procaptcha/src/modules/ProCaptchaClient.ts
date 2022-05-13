import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import {
    ProsopoRandomProviderResponse,
    ProCaptchaConfig,
    ProsopoCaptchaResponse,
    CaptchaSolutionResponse,
    TransactionResponse,
} from "../types";

import { ProCaptcha } from "./ProCaptcha";
import { Extension } from "../api/Extension";
import { ProsopoContract } from "../api/ProsopoContract";
import { ProviderApi } from "../api/ProviderApi";
import { getProsopoContract } from "../modules/contract";
import { getExtension } from "../modules/extension";

export type TExtensionAccount = InjectedAccountWithMeta;

export type TSubmitResult = [CaptchaSolutionResponse, TransactionResponse] | Error;

export interface CaptchaEventCallbacks {
    onLoad?: (extension: Extension, contractAddress: string) => void;
    onSubmit?: (result: TSubmitResult, captchaSolution: number[], captchaChallenge: ProsopoCaptchaResponse, captchaIndex: number) => void;
    onCancel?: () => void;
    onSolved?: () => void;
    onClick?: (captchaSolution: number[]) => void;
    onBeforeLoadCaptcha?: (contract: ProsopoContract, provider: ProsopoRandomProviderResponse) => void;
    onLoadCaptcha?: (captchaChallenge: ProsopoCaptchaResponse) => void;
    onAccountChange?: (account: TExtensionAccount,
        contract: ProsopoContract,
        provider: ProsopoRandomProviderResponse,
    ) => void;
}

export interface IProCaptchaManagerState {
    config: ProCaptchaConfig;
    contractAddress?: string;
    account?: InjectedAccountWithMeta;
    contract?: ProsopoContract;
    provider?: ProsopoRandomProviderResponse;
    extension?: Extension;
}

export interface IProCaptchaManager {
    state: IProCaptchaManagerState;
    dispatch: (value: Partial<IProCaptchaManagerState>) => void;
}

export interface ICaptchaState {
    captchaChallenge?: ProsopoCaptchaResponse;
    currentCaptchaIndex: number;
    currentCaptchaSolution: number[]
}

export interface ICaptchaStateReducer {
    captchaState: ICaptchaState;
    updateCaptchaState: (value: Partial<ICaptchaState>) => void;
}

export interface IStatusState {
    info?: string;
    error?: string;
}

export interface IStatusReducerAction {
    info?: string | [string, any];
    error?: string | [string, any];
}

export interface IStatusReducer {
    status: IStatusState;
    updateStatus: (value: Partial<IStatusReducerAction>) => void;
}

export const captchaManagerReducer = (state: IProCaptchaManagerState, action: Partial<IProCaptchaManagerState>) => {
    return { ...state, ...action };
}

export const captchaStateReducer = (state: ICaptchaState, action: Partial<ICaptchaState>): ICaptchaState => {
    return { ...state, ...action };
}

export const statusReducer = (state: IStatusState, action: IStatusReducerAction): IStatusState => {
    const logger = { info: console.log, error: console.error };
    for (const key in action) {
        logger[key](action[key]);
        return { [key]: Array.isArray(action[key]) ? String(action[key][1]) : String(action[key]) };
    }
    return {};
}

export class ProCaptchaClient {

    public manager: IProCaptchaManager;
    public status: IStatusReducer;
    public callbacks: CaptchaEventCallbacks | undefined;
    public providerApi: ProviderApi;

    constructor(manager: IProCaptchaManager, status: IStatusReducer, callbacks?: CaptchaEventCallbacks) {
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

                    this.manager.dispatch({ extension, contractAddress });

                    if (this.callbacks?.onLoad) {
                        this.callbacks.onLoad(extension, contractAddress);
                    }
                })
                .catch(err => {
                    this.status.updateStatus({ error: ["FAILED TO GET CONTRACT ADDRESS", err.message] });
                });
            return;
        }

        this.manager.dispatch({ contractAddress: contract.address });
    }

    public onExtensionAccountChange(selectedAccount: InjectedAccountWithMeta) {
        this.manager.state.extension!.setAccount(selectedAccount.address).then(async (account) => {
            const contract = await getProsopoContract(this.manager.state.contractAddress!, this.manager.state.config['dappAccount'], account);
            const provider = await contract.getRandomProvider();

            this.manager.dispatch({ account, contract, provider });

            if (this.callbacks?.onAccountChange) {
                this.callbacks.onAccountChange(account, contract, provider);
            }
        });
    }

}

export class ProCaptchaStateClient {

    public context: ProCaptchaClient;
    public manager: ICaptchaStateReducer;

    constructor(context: ProCaptchaClient, manager: ICaptchaStateReducer) {
        this.context = context;
        this.manager = manager;
    }

    public dismissCaptcha() {
        this.manager.updateCaptchaState({ captchaChallenge: undefined });
    }

    public cancelCaptcha() {
        this.dismissCaptcha();
        if (this.context.callbacks?.onCancel) {
            this.context.callbacks.onCancel();
        }
    };

    public async newCaptchaChallenge(contract: ProsopoContract, provider: ProsopoRandomProviderResponse) {
        if (this.context.callbacks?.onBeforeLoadCaptcha) {
            this.context.callbacks.onBeforeLoadCaptcha(contract, provider);
        }
        const proCaptcha = new ProCaptcha(contract, provider, this.context.providerApi);
        const captchaChallenge = await proCaptcha.getCaptchaChallenge();

        this.manager.updateCaptchaState({ captchaChallenge, currentCaptchaIndex: 0 });

        if (this.context.callbacks?.onLoadCaptcha) {
            this.context.callbacks.onLoadCaptcha(captchaChallenge);
        }
    };

    public async submitCaptcha() {
        const { extension, contract, provider } = this.context.manager.state;
        const { captchaChallenge, currentCaptchaIndex, currentCaptchaSolution } = this.manager.captchaState;

        if (!extension || !contract || !provider || !captchaChallenge) {
            return;
        }

        const signer = extension.getInjected().signer;
        const proCaptcha = new ProCaptcha(contract, provider, this.context.providerApi);
        const currentCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
        const { captchaId, datasetId } = currentCaptcha.captcha;

        let submitResult: [CaptchaSolutionResponse, TransactionResponse] | Error;

        try {
            submitResult = await proCaptcha.solveCaptchaChallenge(signer, captchaChallenge.requestHash, captchaId, datasetId, currentCaptchaSolution);
            this.context.status.updateStatus({ info: ["SUBMIT CAPTCHA RESULT", submitResult[0].status] });
        } catch (err) {
            submitResult = err as Error;
            this.context.status.updateStatus({ error: ["FAILED TO SUBMIT CAPTCHA", submitResult.message] });
        }

        if (this.context.callbacks?.onSubmit) {
            this.context.callbacks.onSubmit(submitResult, currentCaptchaSolution, captchaChallenge, currentCaptchaIndex);
        }

        this.manager.updateCaptchaState({ currentCaptchaSolution: [] });

        const nextCaptchaIndex = currentCaptchaIndex + 1;

        if (nextCaptchaIndex < captchaChallenge.captchas.length) {
            this.manager.updateCaptchaState({ currentCaptchaIndex: nextCaptchaIndex });
        } else {
            if (this.context.callbacks?.onSolved) {
                this.context.callbacks.onSolved();
            }
            // TODO after all captchas solved.
            this.context.status.updateStatus({ info: "All captchas answered..." });
            this.dismissCaptcha();
        }
    }

    public onCaptchaSolutionClick(index: number) {
        const { currentCaptchaSolution } = this.manager.captchaState;
        const captchaSolution = currentCaptchaSolution.includes(index) ? currentCaptchaSolution.filter(item => item !== index) : [...currentCaptchaSolution, index];
        this.manager.updateCaptchaState({ currentCaptchaSolution: captchaSolution });

        if (this.context.callbacks?.onClick) {
            this.context.callbacks.onClick(captchaSolution);
        }
    }

}
