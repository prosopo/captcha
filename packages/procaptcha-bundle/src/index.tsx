// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import {
    ApiParams,
    EnvironmentTypesSchema,
    Features,
    FeaturesEnum,
    NetworkNamesSchema,
    ProcaptchaClientConfigInput,
    ProcaptchaConfigSchema,
    ProcaptchaOutput,
} from '@prosopo/types'
import { Procaptcha } from '@prosopo/procaptcha-react'
import { ProcaptchaFrictionless } from '@prosopo/procaptcha-frictionless'
import { ProcaptchaPow } from '@prosopo/procaptcha-pow'
import { at } from '@prosopo/util'
import { createRoot } from 'react-dom/client'

interface ProcaptchaRenderOptions {
    siteKey: string
    theme?: 'light' | 'dark'
    captchaType?: Features
    callback?: (payload: ProcaptchaOutput) => void
    'challenge-valid-length'?: string // seconds for successful challenge to be valid
    'chalexpired-callback'?: string
    'expired-callback'?: string
    'open-callback'?: string
    'close-callback'?: string
    'error-callback'?: string
}

const BUNDLE_NAME = 'procaptcha.bundle.js'

const getProcaptchaScript = () => document.querySelector<HTMLScriptElement>(`script[src*="${BUNDLE_NAME}"]`)

const extractParams = (name: string) => {
    const script = getProcaptchaScript()
    if (script && script.src.indexOf(`${name}`) !== -1) {
        const params = new URLSearchParams(script.src.split('?')[1])
        return {
            onloadUrlCallback: params.get('onload') || undefined,
            renderExplicit: params.get('render') || undefined,
        }
    }
    return { onloadUrlCallback: undefined, renderExplicit: undefined }
}

const getConfig = (siteKey?: string) => {
    if (!siteKey) {
        siteKey = process.env.PROSOPO_SITE_KEY || ''
    }
    return ProcaptchaConfigSchema.parse({
        defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT
            ? EnvironmentTypesSchema.parse(process.env.PROSOPO_DEFAULT_ENVIRONMENT)
            : EnvironmentTypesSchema.enum.development,
        defaultNetwork: process.env.PROSOPO_DEFAULT_NETWORK
            ? NetworkNamesSchema.parse(process.env.PROSOPO_DEFAULT_NETWORK)
            : NetworkNamesSchema.enum.development,
        userAccountAddress: '',
        account: {
            address: siteKey,
        },
        serverUrl: process.env.PROSOPO_SERVER_URL || '',
        mongoAtlasUri: process.env.PROSOPO_MONGO_EVENTS_URI || '',
        devOnlyWatchEvents: process.env._DEV_ONLY_WATCH_EVENTS === 'true' || false,
    })
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
    config: ProcaptchaClientConfigInput,
    renderOptions?: ProcaptchaRenderOptions
) => {
    elements.forEach((element) => {
        const callbackName = renderOptions?.callback
        const chalExpiredCallbackName =
            renderOptions?.['chalexpired-callback'] || element.getAttribute('data-chalexpired-callback')
        const errorCallback = renderOptions?.['error-callback'] || element.getAttribute('data-error-callback')
        const onCloseCallbackName = renderOptions?.['close-callback'] || element.getAttribute('data-close-callback')
        const onOpenCallbackName = renderOptions?.['open-callback'] || element.getAttribute('data-open-callback')
        const onExpiredCallbackName =
            renderOptions?.['expired-callback'] || element.getAttribute('data-expired-callback')

        // Setting up default callbacks object
        const callbacks = {
            onHuman: (payload: ProcaptchaOutput) => handleOnHuman(element, payload),
            onChallengeExpired: () => {
                console.log('Challenge expired')
            },
            onExpired: () => {
                alert('Completed challenge has expired, please try again')
            },
            onError: (error: Error) => {
                console.error(error)
            },
            onClose: () => {
                console.log('Challenge closed')
            },
            onOpen: () => {
                console.log('Challenge opened')
            },
        }

        if (callbackName) callbacks.onHuman = renderOptions?.callback as any // Assuming the callback is set correctly
        if (chalExpiredCallbackName) callbacks.onChallengeExpired = getWindowCallback(chalExpiredCallbackName)
        if (onExpiredCallbackName) callbacks.onExpired = getWindowCallback(onExpiredCallbackName)
        if (errorCallback) callbacks.onError = getWindowCallback(errorCallback)
        if (onCloseCallbackName) callbacks.onClose = getWindowCallback(onCloseCallbackName)
        if (onOpenCallbackName) callbacks.onOpen = getWindowCallback(onOpenCallbackName)

        // Getting and setting the theme
        const themeAttribute = renderOptions?.theme || element.getAttribute('data-theme') || 'light'
        config.theme = validateTheme(themeAttribute)

        // Getting and setting the challenge valid length
        const challengeValidLengthAttribute =
            renderOptions?.['challenge-valid-length'] || element.getAttribute('data-challenge-valid-length')
        if (challengeValidLengthAttribute) {
            config.challengeValidLength = parseInt(challengeValidLengthAttribute)
        }

        switch (renderOptions?.captchaType) {
            case 'pow':
                createRoot(element).render(<ProcaptchaPow config={config} callbacks={callbacks} />)
                break
            case 'frictionless':
                createRoot(element).render(<ProcaptchaFrictionless config={config} callbacks={callbacks} />)
                break
            default:
                createRoot(element).render(<Procaptcha config={config} callbacks={callbacks} />)
                break
        }
    })
}

// Implicit render for targeting all elements with class 'procaptcha'
const implicitRender = () => {
    // Get elements with class 'procaptcha'
    const elements: Element[] = Array.from(document.getElementsByClassName('procaptcha'))

    // Set siteKey from renderOptions or from the first element's data-sitekey attribute
    if (elements.length) {
        const siteKey = at(elements, 0).getAttribute('data-sitekey')
        if (!siteKey) {
            console.error('No siteKey found')
            return
        }
        const features = Object.values(FeaturesEnum)
        const captchaType =
            features.find((feature) => feature === at(elements, 0).getAttribute('data-captcha-type')) ||
            ('frictionless' as const)

        renderLogic(elements, getConfig(siteKey), { captchaType, siteKey })
    }
}

// Explicit render for targeting specific elements
export const render = (element: Element, renderOptions: ProcaptchaRenderOptions) => {
    const siteKey = renderOptions.siteKey

    renderLogic([element], getConfig(siteKey), renderOptions)
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

// extend the global Window interface to include the procaptcha object
declare global {
    interface Window {
        procaptcha: { ready: typeof ready; render: typeof render }
    }
}

// set the procaptcha attribute on the window
window.procaptcha = { ready, render }

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
    getProcaptchaScript()?.addEventListener('load', () => {
        ready(onloadCallback)
    })
}
