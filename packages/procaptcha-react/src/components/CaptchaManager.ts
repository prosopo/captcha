
import { createContext, useReducer } from "react";
import {
    ICaptchaContextState,
    captchaContextReducer,
    captchaStatusReducer,
    ICaptchaContextReducer,
    ProsopoCaptchaClient,
    CaptchaEventCallbacks,
} from "@prosopo/procaptcha";


export function useCaptcha(defaultContext: ICaptchaContextState, callbacks?: CaptchaEventCallbacks): ProsopoCaptchaClient {
    const [context, updateContext] = useReducer(captchaContextReducer, defaultContext);
    const [status, updateStatus] = useReducer(captchaStatusReducer, {});
    return new ProsopoCaptchaClient({ state: context, update: updateContext }, { state: status, update: updateStatus }, callbacks);
}

export const CaptchaContextManager = createContext({
    state: {
        config: {
            "providerApi.baseURL": "",
            "providerApi.prefix": "",
            "dappAccount": ""
        }
    }, 
    update: () => {},
} as ICaptchaContextReducer);
