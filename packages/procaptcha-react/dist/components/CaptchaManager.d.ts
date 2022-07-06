/// <reference types="react" />
import { ICaptchaContextState, ICaptchaContextReducer, ProsopoCaptchaClient, CaptchaEventCallbacks } from "@prosopo/procaptcha";
export declare function useCaptcha(defaultContext: ICaptchaContextState, callbacks?: CaptchaEventCallbacks): ProsopoCaptchaClient;
export declare const CaptchaContextManager: import("react").Context<ICaptchaContextReducer>;
//# sourceMappingURL=CaptchaManager.d.ts.map