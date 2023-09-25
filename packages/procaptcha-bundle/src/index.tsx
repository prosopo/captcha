// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { LogLevel } from '@prosopo/common'
import { ProcaptchaConfigOptional } from '@prosopo/procaptcha'
import { Procaptcha } from '@prosopo/procaptcha-react'
import { ApiParams, EnvironmentTypes, EnvironmentTypesSchema, ProcaptchaOutput } from '@prosopo/types'
import { at } from '@prosopo/util'
import { createRoot } from 'react-dom/client'

interface ProcaptchaRenderOptions {
    theme?: 'light' | 'dark'
    callback?: string
    'chalexpired-callback'?: string
    'error-callback'?: string
}

function getConfig(siteKey?: string): ProcaptchaConfigOptional {
    if (!siteKey) {
        siteKey = process.env.DAPP_SITE_KEY || process.env.PROSOPO_SITE_KEY || ''
    }
    return {
        logLevel: LogLevel.enum.info,
        defaultEnvironment:
            (process.env.DEFAULT_ENVIRONMENT as EnvironmentTypes) || EnvironmentTypesSchema.enum.development,
        userAccountAddress: '',
        web2: true,
        dappName: 'Prosopo',
        account: {
            address: siteKey,
        },
        networks: {
            [EnvironmentTypesSchema.enum.development]: {
                endpoint: process.env.SUBSTRATE_NODE_URL || 'ws://127.0.0.1:9944',
                contract: {
                    address: process.env.PROTOCOL_CONTRACT_ADDRESS || '',
                    name: 'prosopo',
                },
                accounts: [],
            },
            [EnvironmentTypesSchema.enum.rococo]: {
                endpoint: process.env.SUBSTRATE_NODE_URL || 'wss://rococo-contracts-rpc.polkadot.io:443',
                contract: {
                    address:
                        process.env.PROTOCOL_CONTRACT_ADDRESS || '5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u',
                    name: 'prosopo',
                },
                accounts: [],
            },
        },
        solutionThreshold: 80,
        serverUrl: process.env.SERVER_URL || '',
    }
}

const getParentForm = (element: Element): HTMLFormElement | null => {
    let parent = element.parentElement
    while (parent) {
        if (parent.tagName === 'FORM') {
            return parent as HTMLFormElement
        }
        parent = parent.parentElement
    }
    return null
}

const getWindowCallback = (callbackName: string) => (window as any)[callbackName.replace('window.', '')]

const handleOnHuman = (element: Element, payload: ProcaptchaOutput) => {
    const form = getParentForm(element)
    if (!form) return

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = ApiParams.procaptchaResponse
    input.value = JSON.stringify(payload)
    form.appendChild(input)
}

const validateTheme = (themeAttribute: string): 'light' | 'dark' => {
    const customThemeList = ['light', 'dark']
    return customThemeList.includes(themeAttribute) ? (themeAttribute as 'light' | 'dark') : 'light'
}

export const render = (siteKey?: string, renderOptions?: ProcaptchaRenderOptions) => {
    // Get elements with class 'procaptcha'
    const elements: Element[] = Array.from(document.getElementsByClassName('procaptcha'))

    // Set siteKey from renderOptions or from the first element's data-sitekey attribute
    siteKey = siteKey || at(elements, 0).getAttribute('data-sitekey') || undefined
    const config = getConfig(siteKey)

    elements.forEach((element) => {
        const callbackName = renderOptions?.callback || element.getAttribute('data-callback')
        const chalExpiredCallbackName =
            renderOptions?.['chalexpired-callback'] || element.getAttribute('data-chalexpired-callback')
        const errorCallback = renderOptions?.['error-callback'] || element.getAttribute('data-error-callback')

        // Setting up default callbacks object
        const callbacks = {
            onHuman: (payload: ProcaptchaOutput) => handleOnHuman(element, payload),
            onChallengeExpired: () => {}, // Leave it empty or add a handler as per your requirements
            onError: (error: Error) => {}, // Leave it empty or add a handler as per your requirements
        }

        if (callbackName) callbacks.onHuman = getWindowCallback(callbackName)
        if (chalExpiredCallbackName) callbacks.onChallengeExpired = getWindowCallback(chalExpiredCallbackName)
        if (errorCallback) callbacks.onError = getWindowCallback(errorCallback)

        // Getting and setting the theme
        const themeAttribute = element.getAttribute('data-theme') || 'light'
        config.theme = validateTheme(themeAttribute)

        createRoot(element).render(<Procaptcha config={config} callbacks={callbacks} />)
    })
}

export default function ready(fn: () => void) {
    if (document && document.readyState != 'loading') {
        console.log('document.readyState ready!')
        fn()
    } else {
        console.log('DOMContentLoaded listener!')
        document.addEventListener('DOMContentLoaded', fn)
    }
}

ready(render)
