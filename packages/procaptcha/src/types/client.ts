// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types";
import { CaptchaSolutionResponse, GetCaptchaResponse, ProsopoCaptchaConfig } from "../types/api";
import { TransactionResponse } from "../types/contract";
import { CaptchaSolutionCommitment} from "@prosopo/datasets";

export type TExtensionAccount = InjectedAccountWithMeta;

export type CaptchaSolutionCommitmentId = string;

export type TCaptchaSubmitResult = [CaptchaSolutionResponse, CaptchaSolutionCommitmentId, TransactionResponse?, CaptchaSolutionCommitment?];

export interface IExtensionInterface {
    checkExtension(): void;
    getExtension(): InjectedExtension | undefined;
    getAccounts(): InjectedAccountWithMeta[];
    getAccount(): InjectedAccountWithMeta | undefined;
    setAccount(account: string): void;
    unsetAccount(): void;
    getDefaultAccount(): InjectedAccountWithMeta | undefined;
    setDefaultAccount(): void;
    createAccount(): Promise<InjectedAccountWithMeta | undefined>;
  }

export interface ICaptchaClientEvents {
    onLoad?: (extension: IExtensionInterface, contractAddress: string) => void;
    onAccountChange?: (account?: TExtensionAccount) => void;
}

export interface ICaptchaStateClientEvents {
    onLoadCaptcha?: (captchaChallenge: GetCaptchaResponse | Error) => void;
    onSubmit?: (result: TCaptchaSubmitResult | Error, captchaState: ICaptchaState) => void;
    onChange?: (captchaSolution: string[][], index: number) => void;
    onCancel?: () => void;
    onSolved?: (result: TCaptchaSubmitResult, isHuman?: boolean) => void;
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
    captchaIndex: number;
    captchaSolution: string[][];
    // captchaSolutions: CaptchaSolution[];
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
