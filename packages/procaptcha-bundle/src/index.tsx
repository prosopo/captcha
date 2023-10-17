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
    siteKey: string
    theme?: 'light' | 'dark'
    callback?: string
    'chalexpired-callback'?: string
    'expired-callback'?: string //todo
    'open-callback'?: string //todo
    'close-callback'?: string //todo
    'error-callback'?: string
}

type ProcaptchaUrlParams = {
    onloadUrlCallback: string | undefined
    renderExplicit: string | undefined
}

const BUNDLE_NAME = 'procaptcha.bundle.js'

const getCurrentScript = () =>
    document && document.currentScript && 'src' in document.currentScript && document.currentScript.src !== undefined
        ? document.currentScript
        : undefined

const extractParams = (name: string): ProcaptchaUrlParams => {
    const script = getCurrentScript()
    if (script && script.src.indexOf(`${name}`) !== -1) {
        const params = new URLSearchParams(script.src.split('?')[1])
        return {
            onloadUrlCallback: params.get('onload') || undefined,
            renderExplicit: params.get('render') || undefined,
        }
    }
    return { onloadUrlCallback: undefined, renderExplicit: undefined }
}

const getConfig = (siteKey?: string): ProcaptchaConfigOptional => {
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

const getParentForm = (element: Element): HTMLFormElement | null => element.closest('form') as HTMLFormElement

const getWindowCallback = (callbackName: string) => {
    const fn = (window as any)[callbackName.replace('window.', '')]
    if (typeof fn !== 'function') {
        throw new Error(`Callback ${callbackName} is not defined on the window object`)
    }
    return fn
}

const handleOnHuman = (element: Element, payload: ProcaptchaOutput) => {
    const form = getParentForm(element)

    if (!form) {
        console.error('Parent form not found for the element:', element)
        return
    }

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = ApiParams.procaptchaResponse
    input.value = JSON.stringify(payload)
    form.appendChild(input)
}

const customThemeSet = new Set(['light', 'dark'])
const validateTheme = (themeAttribute: string): 'light' | 'dark' =>
    customThemeSet.has(themeAttribute) ? (themeAttribute as 'light' | 'dark') : 'light'

const renderLogic = (
    elements: Element[],
    config: ProcaptchaConfigOptional,
    renderOptions?: ProcaptchaRenderOptions
) => {
    elements.forEach((element) => {
        const callbackName = renderOptions?.callback || element.getAttribute('data-callback')
        const chalExpiredCallbackName =
            renderOptions?.['chalexpired-callback'] || element.getAttribute('data-chalexpired-callback')
        const errorCallback = renderOptions?.['error-callback'] || element.getAttribute('data-error-callback')

        // Setting up default callbacks object
        const callbacks = {
            onHuman: (payload: ProcaptchaOutput) => handleOnHuman(element, payload),
            onChallengeExpired: () => {
                console.log('Challenge expired')
            },
            onError: (error: Error) => {
                console.error(error)
            },
        }

        if (callbackName) callbacks.onHuman = getWindowCallback(callbackName)
        if (chalExpiredCallbackName) callbacks.onChallengeExpired = getWindowCallback(chalExpiredCallbackName)
        if (errorCallback) callbacks.onError = getWindowCallback(errorCallback)

        // Getting and setting the theme
        const themeAttribute = renderOptions?.theme || element.getAttribute('data-theme') || 'light'
        config.theme = validateTheme(themeAttribute)

        createRoot(element).render(<Procaptcha config={config} callbacks={callbacks} />)
    })
}

// Implicit render for targeting all elements with class 'procaptcha'
const implicitRender = () => {
    // Get elements with class 'procaptcha'
    const elements: Element[] = Array.from(document.getElementsByClassName('procaptcha'))

    // Set siteKey from renderOptions or from the first element's data-sitekey attribute
    if (elements.length) {
        const siteKey = at(elements, 0).getAttribute('data-sitekey') || undefined
        const config = getConfig(siteKey)

        renderLogic(elements, config)
    }
}

// Explicit render for targeting specific elements
export const render = (elementId: string, renderOptions: ProcaptchaRenderOptions) => {
    const siteKey = renderOptions.siteKey
    const config = getConfig(siteKey)
    const element = document.getElementById(elementId)

    if (!element) {
        console.error('Element not found:', elementId)
        return
    }

    renderLogic([element], config, renderOptions)
}

export default function ready(fn: () => void) {
    if (document && document.readyState !== 'loading') {
        console.log('document.readyState ready!')
        fn()
    } else {
        console.log('DOMContentLoaded listener!')
        document.addEventListener('DOMContentLoaded', fn)
    }
}

// onLoadUrlCallback defines the name of the callback function to be called when the script is loaded
// onRenderExplicit takes values of either explicit or implicit
const { onloadUrlCallback, renderExplicit } = extractParams(BUNDLE_NAME)

// Render the Procaptcha component implicitly if renderExplicit is not set to explicit
if (renderExplicit !== 'explicit') {
    ready(implicitRender)
}

if (onloadUrlCallback) {
    const onloadCallback = getWindowCallback(onloadUrlCallback)
    // Add event listener to the script tag to call the callback function when the script is loaded
    getCurrentScript()?.addEventListener('load', () => {
        ready(onloadCallback)
    })
}
