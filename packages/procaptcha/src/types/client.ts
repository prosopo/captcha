import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import { ProsopoRandomProviderResponse, ProsopoCaptchaConfig, GetCaptchaResponse, CaptchaSolutionResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import { Extension } from "../api/Extension";
import { ProsopoContract } from "../api/ProsopoContract";

export type TExtensionAccount = InjectedAccountWithMeta;

export type TCaptchaSubmitResult = [CaptchaSolutionResponse, TransactionResponse] | Error;

export interface CaptchaEventCallbacks {
    onLoad?: (extension: Extension, contractAddress: string) => void;
    onSubmit?: (result: TCaptchaSubmitResult, captchaSolution: number[], captchaChallenge: GetCaptchaResponse, captchaIndex: number) => void;
    onChange?: (captchaSolution: number[]) => void;
    onCancel?: () => void;
    onSolved?: () => void;
    onLoadCaptcha?: (captchaChallenge: GetCaptchaResponse) => void;
    onBeforeLoadCaptcha?: (contract: ProsopoContract, provider: ProsopoRandomProviderResponse) => void;
    onAccountChange?: (account: TExtensionAccount,
        contract: ProsopoContract,
        provider: ProsopoRandomProviderResponse,
    ) => void;
}

export interface ICaptchaManagerState {
    config: ProsopoCaptchaConfig;
    contractAddress?: string;
    account?: InjectedAccountWithMeta;
    contract?: ProsopoContract;
    provider?: ProsopoRandomProviderResponse;
    extension?: Extension;
}

export interface ICaptchaManagerReducer {
    state: ICaptchaManagerState;
    update: (value: Partial<ICaptchaManagerState>) => void;
}

export interface ICaptchaState {
    captchaChallenge?: GetCaptchaResponse;
    currentCaptchaIndex: number;
    currentCaptchaSolution: number[]
}

export interface ICaptchaStateReducer {
    state: ICaptchaState;
    update: (value: Partial<ICaptchaState>) => void;
}

export interface ICaptchaStatusState {
    info?: string;
    error?: string;
}

export interface ICaptchaStatusReducerAction {
    info?: [string, any] | string;
    error?: [string, any] | string | Error;
}

export interface ICaptchaStatusReducer {
    state: ICaptchaStatusState;
    update: (value: Partial<ICaptchaStatusReducerAction>) => void;
}
