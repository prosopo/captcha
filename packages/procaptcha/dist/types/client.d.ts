import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types";
import { ProsopoCaptchaConfig, GetCaptchaResponse, CaptchaSolutionResponse } from "../types/api";
import { TransactionResponse } from "../types/contract";
import { CaptchaSolutionCommitment } from "@prosopo/contract";
export declare type TExtensionAccount = InjectedAccountWithMeta;
export declare type TCaptchaSubmitResult = [CaptchaSolutionResponse, TransactionResponse?, CaptchaSolutionCommitment?];
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
export interface CaptchaEventCallbacks extends ICaptchaClientEvents, ICaptchaStateClientEvents {
}
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
//# sourceMappingURL=client.d.ts.map