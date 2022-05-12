
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
    config?: ProCaptchaConfig;
    contractAddress?: string;
    account?: InjectedAccountWithMeta;
    contract?: ProsopoContract;
    provider?: ProsopoRandomProviderResponse;
    extension?: Extension;
}

// TODO mv manager events, types to procaptcha.
export const onExtensionAccountChange = (account: InjectedAccountWithMeta, context: IProCaptchaManager, 
    cb: (account: InjectedAccountWithMeta, contract: ProsopoContract, provider: ProsopoRandomProviderResponse) => void) => {
    context.state.extension!.setAccount(account.address).then(async (account) => {
        context.dispatch({account});

        const contract = await getProsopoContract(context.state.contractAddress!, context.state.config!['dappAccount'], account);
        context.dispatch({contract});

        const provider = await contract.getRandomProvider();
        context.dispatch({provider});

        cb(account, contract, provider);
    });
};

export const captchaManagerReducer = (state: CaptchaManagerState, action: Partial<CaptchaManagerState>) => {
    return { ...state, ...action };
}

export const ProCaptchaManager = createContext({ state: {}, dispatch: () => {} } as IProCaptchaManager);

export default ProCaptchaManager;
