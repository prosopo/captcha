import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import { ProsopoRandomProviderResponse, ProsopoCaptchaConfig, GetCaptchaResponse, CaptchaSolutionResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import { Extension } from "../api/Extension";
import { ProsopoContract } from "../api/ProsopoContract";
import {CaptchaSolution} from "@prosopo/provider";

export type TExtensionAccount = InjectedAccountWithMeta;

export type TCaptchaSubmitResult = [CaptchaSolutionResponse, TransactionResponse] | Error;


export interface ICaptchaClientEvents {
    onLoad?: (extension: Extension, contractAddress: string) => void;
    onAccountChange?: (account: TExtensionAccount, contract: ProsopoContract, provider: ProsopoRandomProviderResponse) => void;
}

export interface ICaptchaStateClientEvents {
    onLoadCaptcha?: (captchaChallenge: GetCaptchaResponse | Error) => void;
    onSubmit?: (result: TCaptchaSubmitResult, captchaState: ICaptchaState) => void;
    onChange?: (captchaSolution: number[]) => void;
    onCancel?: () => void;
    onSolved?: () => void;
}

export interface CaptchaEventCallbacks extends ICaptchaClientEvents, ICaptchaStateClientEvents { }

export interface ICaptchaManagerState {
    config: ProsopoCaptchaConfig;
    contractAddress?: string;
    account?: InjectedAccountWithMeta;
}

export interface ICaptchaManagerReducer {
    state: ICaptchaManagerState;
    update: (value: Partial<ICaptchaManagerState>) => void;
}

export interface ICaptchaState {
    captchaChallenge?: GetCaptchaResponse;
    currentCaptchaIndex: number;
    currentCaptchaSolution: number[];
    captchaSolutions: CaptchaSolution[]
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
