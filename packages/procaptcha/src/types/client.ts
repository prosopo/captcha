import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types";

import { ProsopoCaptchaConfig, GetCaptchaResponse, CaptchaSolutionResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";

import { Extension } from "../api/Extension";;


export type TExtensionAccount = InjectedAccountWithMeta;

export type TCaptchaSubmitResult = [CaptchaSolutionResponse, TransactionResponse] | Error;

export interface IExtensionInterface {
    checkExtension(): void;
    getExtension(): InjectedExtension;
    getAccounts(): InjectedAccountWithMeta[];
    getAccount(): InjectedAccountWithMeta | undefined;
    setAccount(account: string): void;
    unsetAccount(): void;
    getDefaultAccount(): InjectedAccountWithMeta | undefined;
    setDefaultAccount(): void;
  }

export interface ICaptchaClientEvents {
    onLoad?: (extension: IExtensionInterface, contractAddress: string) => void;
    onAccountChange?: (account?: TExtensionAccount) => void;
}

export interface ICaptchaStateClientEvents {
    onLoadCaptcha?: (captchaChallenge: GetCaptchaResponse | Error) => void;
    onSubmit?: (result: TCaptchaSubmitResult, captchaState: ICaptchaState) => void;
    onChange?: (captchaSolution: number[]) => void;
    onCancel?: () => void;
    onSolved?: () => void;
}

export interface CaptchaEventCallbacks extends ICaptchaClientEvents, ICaptchaStateClientEvents { }

export interface ICaptchaContextState {
    config: ProsopoCaptchaConfig;
    contractAddress?: string;
    account?: InjectedAccountWithMeta;
}

export interface ICaptchaContextReducer {
    state: ICaptchaContextState;
    update: (value: Partial<ICaptchaContextState>) => void;
}

export interface ICaptchaState {
    captchaChallenge?: GetCaptchaResponse;
    currentCaptchaIndex: number;
    currentCaptchaSolution: number[];
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
