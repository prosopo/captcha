// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo/procaptcha-react>.
//
// procaptcha-react is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha-react is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha-react.  If not, see <http://www.gnu.org/licenses/>.

import { createContext, useReducer } from 'react'
import {
    CaptchaEventCallbacks,
    ICaptchaContextReducer,
    ICaptchaContextState,
    ProsopoCaptchaClient,
    ProsopoClientConfig,
    captchaContextReducer,
    captchaStatusReducer,
} from '@prosopo/procaptcha'


export function useCaptcha(defaultContext: ICaptchaContextState, callbacks?: CaptchaEventCallbacks): ProsopoCaptchaClient {
    const [context, updateContext] = useReducer(captchaContextReducer, defaultContext);
    return new ProsopoCaptchaClient({ state: context, update: updateContext }, callbacks);
}

export const CaptchaContextManager = createContext({
    state: {
        config: {
            defaultEnvironment: 'development',
            logLevel: 'info',
            solutionThreshold: 0,
            web2: false,
            networks: {
                development: {
                    endpoint: '',
                    prosopoContract: {
                        address: '',
                        name: '',
                    },
                    dappContract: {
                        address: '',
                        name: '',
                    },
                    accounts: ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'],
                },
            },
            accountCreator: {
                area: { width: 0, height: 0 },
                offsetParameter: 0,
                multiplier: 0,
                fontSizeFactor: 0,
                maxShadowBlur: 0,
                numberOfRounds: 0,
                seed: 0,
            },
            dappName: '',
            serverUrl: '',
        } as ProsopoClientConfig,
    },
    update: () => {},
} as ICaptchaContextReducer)
