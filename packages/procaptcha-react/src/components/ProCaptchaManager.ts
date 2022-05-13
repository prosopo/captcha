
import { createContext } from "react";

import { IProCaptchaManager, IProCaptchaManagerState } from "@prosopo/procaptcha";

// export interface ProCaptchaManager extends IProCaptchaManager {
//     state: IProCaptchaManagerState;
//     dispatch: React.Dispatch<Partial<IProCaptchaManagerState>>;
// };

export const ProCaptchaManager = createContext({
    state: {
        config: {
            "providerApi.baseURL": "",
            "providerApi.prefix": "",
            "dappAccount": ""
        }
    }, dispatch: () => {} } as IProCaptchaManager);

export default ProCaptchaManager;
