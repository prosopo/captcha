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
    Features,
    FeaturesEnum,
    ProcaptchaClientConfigInput,
    ProcaptchaClientConfigOutput,
    ProcaptchaConfigSchema,
    ProcaptchaToken,
} from '@prosopo/types'
import { Procaptcha } from '@prosopo/procaptcha-react'
import { ProcaptchaFrictionless } from '@prosopo/procaptcha-frictionless'
import { ProcaptchaPow } from '@prosopo/procaptcha-pow'
import { at } from '@prosopo/util'
import { createRoot } from 'react-dom/client'
import { getAddress, getDevOnlyWatchEventsFlag, getMongoAtlasURI, getServerUrl } from '@prosopo/config'

interface ProcaptchaRenderOptions {
    siteKey: string
    theme?: 'light' | 'dark'
    captchaType?: Features
    callback?: string | ((token: ProcaptchaToken) => void)
    'challenge-valid-length'?: string // seconds for successful challenge to be valid
    'chalexpired-callback'?: string | (() => void)
    'expired-callback'?: string | (() => void)
    'open-callback'?: string | (() => void)
    'close-callback'?: string | (() => void)
    'error-callback'?: string | (() => void)
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

const getConfig = (siteKey?: string): ProcaptchaClientConfigOutput => {
    if (!siteKey) {
        siteKey = getAddress()
    }
    return ProcaptchaConfigSchema.parse({
        account: {
            address: siteKey,
        },
        serverUrl: getServerUrl(),
        mongoAtlasUri: getMongoAtlasURI(),
        devOnlyWatchEvents: getDevOnlyWatchEventsFlag(),
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

const handleOnHuman = (element: Element, token: ProcaptchaToken) => {
    const form = getParentForm(element)

    if (!form) {
        console.error('Parent form not found for the element:', element)
        return
    }

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = ApiParams.procaptchaResponse
    input.value = token
    form.appendChild(input)
}

const customThemeSet = new Set(['light', 'dark'])
const validateTheme = (themeAttribute: string): 'light' | 'dark' =>
    customThemeSet.has(themeAttribute) ? (themeAttribute as 'light' | 'dark') : 'light'

/**
 * Set the timeout for a solved captcha, after which point the captcha will be considered invalid and the captcha widget
 * will re-render. The same value is used for PoW and image captcha.
 * @param renderOptions
 * @param element
 * @param config
 */
const setValidChallengeLength = (
    renderOptions: ProcaptchaRenderOptions | undefined,
    element: Element,
    config: ProcaptchaClientConfigOutput
) => {
    const challengeValidLengthAttribute =
        renderOptions?.['challenge-valid-length'] || element.getAttribute('data-challenge-valid-length')
    if (challengeValidLengthAttribute) {
        config.captchas.image.solutionTimeout = parseInt(challengeValidLengthAttribute)
        config.captchas.pow.solutionTimeout = parseInt(challengeValidLengthAttribute)
    }
}

const getDefaultCallbacks = (element: Element) => ({
    onHuman: (token: ProcaptchaToken) => handleOnHuman(element, token),
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
})

const setTheme = (
    renderOptions: ProcaptchaRenderOptions | undefined,
    element: Element,
    config: ProcaptchaClientConfigInput
) => {
    const themeAttribute = renderOptions?.theme || element.getAttribute('data-theme') || 'light'
    config.theme = validateTheme(themeAttribute)
}

function setUserCallbacks(
    renderOptions: ProcaptchaRenderOptions | undefined,
    callbacks: {
        onHuman: (token: ProcaptchaToken) => void
        onChallengeExpired: () => void
        onExpired: () => void
        onError: (error: Error) => void
        onClose: () => void
        onOpen: () => void
    },
    element: Element
) {
    if (typeof renderOptions?.callback === 'function') {
        callbacks.onHuman = renderOptions.callback
    } else {
        const callbackName =
            typeof renderOptions?.callback === 'string'
                ? renderOptions?.callback
                : element.getAttribute('data-callback')
        if (callbackName) callbacks.onHuman = getWindowCallback(callbackName)
    }

    if (typeof renderOptions?.['chalexpired-callback'] === 'function') {
        callbacks.onChallengeExpired = renderOptions['chalexpired-callback']
    } else {
        const chalExpiredCallbackName =
            typeof renderOptions?.['chalexpired-callback'] === 'string'
                ? renderOptions?.['chalexpired-callback']
                : element.getAttribute('data-chalexpired-callback')
        if (chalExpiredCallbackName) callbacks.onChallengeExpired = getWindowCallback(chalExpiredCallbackName)
    }

    if (typeof renderOptions?.['expired-callback'] === 'function') {
        callbacks.onExpired = renderOptions['expired-callback']
    } else {
        const onExpiredCallbackName =
            typeof renderOptions?.['expired-callback'] === 'string'
                ? renderOptions?.['expired-callback']
                : element.getAttribute('data-expired-callback')
        if (onExpiredCallbackName) callbacks.onExpired = getWindowCallback(onExpiredCallbackName)
    }

    if (typeof renderOptions?.['error-callback'] === 'function') {
        callbacks.onError = renderOptions['error-callback']
    } else {
        const errorCallbackName =
            typeof renderOptions?.['error-callback'] === 'string'
                ? renderOptions?.['error-callback']
                : element.getAttribute('data-error-callback')
        if (errorCallbackName) callbacks.onError = getWindowCallback(errorCallbackName)
    }

    if (typeof renderOptions?.['close-callback'] === 'function') {
        callbacks.onClose = renderOptions['close-callback']
    } else {
        const onCloseCallbackName =
            typeof renderOptions?.['close-callback'] === 'string'
                ? renderOptions?.['close-callback']
                : element.getAttribute('data-close-callback')
        if (onCloseCallbackName) callbacks.onClose = getWindowCallback(onCloseCallbackName)
    }

    if (renderOptions?.['open-callback']) {
        if (typeof renderOptions['open-callback'] === 'function') {
            callbacks.onOpen = renderOptions['open-callback']
        } else {
            const onOpenCallbackName =
                typeof renderOptions?.['open-callback'] === 'string'
                    ? renderOptions?.['open-callback']
                    : element.getAttribute('data-open-callback')
            if (onOpenCallbackName) callbacks.onOpen = getWindowCallback(onOpenCallbackName)
        }
    }
}

const renderLogic = (
    elements: Element[],
    config: ProcaptchaClientConfigOutput,
    renderOptions?: ProcaptchaRenderOptions
) => {
    elements.forEach((element) => {
        const callbacks = getDefaultCallbacks(element)

        setUserCallbacks(renderOptions, callbacks, element)
        setTheme(renderOptions, element, config)
        setValidChallengeLength(renderOptions, element, config)

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
