
import { useState, createContext } from "react";
import ReactDOM from "react-dom/client";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import {
    ProsopoRandomProviderResponse,
    ProsopoCaptchaResponse,
    ProsopoContract,
    Extension,
    ProviderApi,
    getExtension,
    getProsopoContract,
    ProCaptcha,
    ProCaptchaConfig,
    CaptchaSolutionResponse
} from "@prosopo/procaptcha";

export interface IProCaptchaManager {
    state: CaptchaManagerState;
    dispatch: React.Dispatch<Partial<CaptchaManagerState>>;
};

export interface CaptchaManagerState {
    account: InjectedAccountWithMeta | null;
    contract: ProsopoContract | null;
    provider: ProsopoRandomProviderResponse | null;
}

export const ProCaptchaManager = createContext({ state: { account: null, contract: null, provider: null }, dispatch: () => {} });

export default ProCaptchaManager;
