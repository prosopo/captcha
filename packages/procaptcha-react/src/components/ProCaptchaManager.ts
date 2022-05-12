
import { useState, createContext } from "react";
import ReactDOM from "react-dom/client";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import {
    ProsopoRandomProviderResponse,
    ProsopoContract,
    Extension,
    ProCaptchaConfig,
    getProsopoContract
} from "@prosopo/procaptcha";

export interface IProCaptchaManager {
    state: CaptchaManagerState;
    dispatch: React.Dispatch<Partial<CaptchaManagerState>>;
};

export interface CaptchaManagerState {
    config: ProCaptchaConfig;
    contractAddress?: string;
    account?: InjectedAccountWithMeta;
    contract?: ProsopoContract;
    provider?: ProsopoRandomProviderResponse;
    extension?: Extension;
}

// TODO mv manager events, types to procaptcha.
export const onExtensionAccountChange = (selectedAccount: InjectedAccountWithMeta, context: IProCaptchaManager, 
    cb: (account: InjectedAccountWithMeta, contract: ProsopoContract, provider: ProsopoRandomProviderResponse) => void) => {
    context.state.extension!.setAccount(selectedAccount.address).then(async (account) => {
        
        const contract = await getProsopoContract(context.state.contractAddress!, context.state.config['dappAccount'], account);
        const provider = await contract.getRandomProvider();

        context.dispatch({account, contract, provider});

        cb(account, contract, provider);
        
    });
};

export const captchaManagerReducer = (state: CaptchaManagerState, action: Partial<CaptchaManagerState>) => {
    return { ...state, ...action };
}

export const ProCaptchaManager = createContext({
    state: {
        config: {
            "providerApi.baseURL": "",
            "providerApi.prefix": "",
            "dappAccount": ""
        }
    }, dispatch: () => {} } as IProCaptchaManager);

export default ProCaptchaManager;
