
import { useState, createContext } from "react";
import ReactDOM from "react-dom/client";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import {
    ProsopoRandomProviderResponse,
    ProsopoContract,
    Extension,
} from "@prosopo/procaptcha";

export interface IProCaptchaManager {
    state: CaptchaManagerState;
    dispatch: React.Dispatch<Partial<CaptchaManagerState>>;
};

export interface CaptchaManagerState {
    account: InjectedAccountWithMeta | null;
    contract: ProsopoContract | null;
    provider: ProsopoRandomProviderResponse | null;
    extension: Extension | null;
}

export const ProCaptchaManager = createContext({ state: { account: null, contract: null, provider: null, extension: null }, dispatch: () => {} });

export default ProCaptchaManager;
