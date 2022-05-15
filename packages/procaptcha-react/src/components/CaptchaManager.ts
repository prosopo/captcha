
import { createContext, useReducer } from "react";
import {
    ICaptchaManagerState,
    captchaManagerReducer,
    captchaStatusReducer,
    ICaptchaStatusState,
    ICaptchaManagerReducer,
    ICaptchaStatusReducer,
} from "@prosopo/procaptcha";


export function useCaptcha(defaultManager: ICaptchaManagerState, defaultStatus?: ICaptchaStatusState): [ICaptchaManagerReducer, ICaptchaStatusReducer] {
    const [state, update] = useReducer(captchaManagerReducer, defaultManager);
    const [status, updateStatus] = useReducer(captchaStatusReducer, defaultStatus || {});

    return [{ state, update }, { state: status, update: updateStatus }];
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
