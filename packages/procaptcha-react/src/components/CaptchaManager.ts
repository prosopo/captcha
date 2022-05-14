
import { createContext } from "react";

import { ICaptchaContextReducer, ICaptchaContextState } from "@prosopo/procaptcha";

// export interface ProCaptchaManager extends IProCaptchaManager {
//     state: IProCaptchaManagerState;
//     dispatch: React.Dispatch<Partial<IProCaptchaManagerState>>;
// };

export const CaptchaManager = createContext({
    state: {
        config: {
            "providerApi.baseURL": "",
            "providerApi.prefix": "",
            "dappAccount": ""
        }
    }, update: () => {} } as ICaptchaContextReducer);

export default CaptchaManager;
