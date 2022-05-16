
import { createContext, useReducer } from "react";
import {
    ICaptchaManagerState,
    captchaManagerReducer,
    captchaStatusReducer,
    ICaptchaStatusState,
    ICaptchaManagerReducer,
    ProsopoCaptchaClient,
    CaptchaEventCallbacks,
} from "@prosopo/procaptcha";


export function useCaptcha(defaultManager: ICaptchaManagerState, callbacks?: CaptchaEventCallbacks): ProsopoCaptchaClient {
    const [state, update] = useReducer(captchaManagerReducer, defaultManager);
    const [status, updateStatus] = useReducer(captchaStatusReducer, {});

    return new ProsopoCaptchaClient({ state, update }, { state: status, update: updateStatus }, callbacks);
}

export const CaptchaManager = createContext({
    state: {
        config: {
            "providerApi.baseURL": "",
            "providerApi.prefix": "",
            "dappAccount": ""
        }
    }, 
    update: () => {},
} as ICaptchaManagerReducer);
