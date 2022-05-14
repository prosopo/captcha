
import { ICaptchaContextState, ICaptchaState, ICaptchaStatusState, ICaptchaStatusReducerAction } from '../types';


export const captchaContextReducer = (state: ICaptchaContextState, action: Partial<ICaptchaContextState>) => {
    return { ...state, ...action };
}

export const captchaStateReducer = (state: ICaptchaState, action: Partial<ICaptchaState>): ICaptchaState => {
    return { ...state, ...action };
}

export const statusReducer = (state: ICaptchaStatusState, action: ICaptchaStatusReducerAction): ICaptchaStatusState => {
    const logger = { info: console.log, error: console.error };
    for (const key in action) {
        logger[key](action[key]);
        if (Array.isArray(action[key])) {
            break;
        }
        let status = action[key];
        if (status instanceof Error) {
            status = status.message;
        }
        return { [key]: String(status) };
    }
    return state;
}