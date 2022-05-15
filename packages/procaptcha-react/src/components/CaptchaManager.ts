
import { createContext, useReducer } from "react";
import {
    ICaptchaManagerState,
    captchaManagerReducer,
    statusReducer,
    ICaptchaStatusState,
    ICaptchaManagerReducer,
    ICaptchaStatusReducer,
} from "@prosopo/procaptcha";


export function useCaptcha(defaultContext: ICaptchaManagerState, defaultStatus?: ICaptchaStatusState): [ICaptchaManagerReducer, ICaptchaStatusReducer] {
    const [state, update] = useReducer(captchaManagerReducer, defaultContext);
    const [status, updateStatus] = useReducer(statusReducer, defaultStatus || {});

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
