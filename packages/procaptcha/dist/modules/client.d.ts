import { ICaptchaContextState, ICaptchaState, ICaptchaStatusState, ICaptchaStatusReducerAction } from '../types';
export declare const captchaContextReducer: (state: ICaptchaContextState, action: Partial<ICaptchaContextState>) => {
    config: import("../types").ProsopoCaptchaConfig;
    contractAddress?: string | undefined;
    account?: import("@polkadot/extension-inject/types").InjectedAccountWithMeta | undefined;
};
export declare const captchaStateReducer: (state: ICaptchaState, action: Partial<ICaptchaState>) => ICaptchaState;
export declare const captchaStatusReducer: (state: ICaptchaStatusState, action: ICaptchaStatusReducerAction) => ICaptchaStatusState;
//# sourceMappingURL=client.d.ts.map