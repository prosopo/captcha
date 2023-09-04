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
import { ApiParams, EnvironmentTypes, EnvironmentTypesSchema, ProcaptchaOutput } from '@prosopo/types'
import { LogLevelSchema } from '@prosopo/common'
import { ProcapchaEventNames, ProcaptchaCallbacks, ProcaptchaConfigOptional } from '@prosopo/procaptcha'
import { Procaptcha } from '@prosopo/procaptcha-react'
import { createRoot } from 'react-dom/client'
import { at } from '@prosopo/util'
import React from 'react'

function getConfig(siteKey?: string): ProcaptchaConfigOptional {
    if (!siteKey) {
        siteKey = process.env.DAPP_SITE_KEY || process.env.PROSOPO_SITE_KEY || ''
    }
    return {
        logLevel: LogLevelSchema.enum.Info,
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

function getParentForm(element: Element): HTMLFormElement | null {
    let parent = element.parentElement
    while (parent) {
        if (parent.tagName === 'FORM') {
            return parent as HTMLFormElement
        }
        parent = parent.parentElement
    }
    return null
}

export function render(callbacks?: ProcaptchaCallbacks) {
    const elements: Element[] = Array.from(document.getElementsByClassName('procaptcha'))
    const siteKey = at(elements,0).getAttribute('data-sitekey') || undefined
    const config = getConfig(siteKey)
    if (!callbacks) {
        callbacks = {}
    }

    for (const element of elements) {
        // get the custom callback functions for procaptcha events, if set
        for (const callbackName of ProcapchaEventNames) {
            const dataCallbackName = `data-${callbackName.toLowerCase()}` // e.g. data-onhuman
            const callback = element.getAttribute(dataCallbackName)
            if (callback) {
                // @ts-ignore
                callbacks[callbackName] = window[callback.replace('window.', '')]
            }
        }
        // get the custom theme, if set
        const customTheme = element.getAttribute(`data-custom-theme`)
        if (customTheme) {
            config['sx'] = JSON.parse(customTheme)
        }

        // set a default callback for onHuman, if not set
        if (!callbacks['onHuman']) {
            // append the prosopo payload to the containing form
            callbacks['onHuman'] = function (payload: ProcaptchaOutput) {
                // get form
                const form = getParentForm(element)
                // add a listener to the onSubmit event of the form
                if (form) {
                    // add the payload to the form
                    const input = document.createElement('input')
                    input.type = 'hidden'
                    ;(input.name = ApiParams.procaptchaResponse), (input.value = JSON.stringify(payload))
                    form.appendChild(input)
                }
            }
        }
        const root = createRoot(element)
        root.render(<Procaptcha config={config} callbacks={callbacks} />) //wrap in fn and give user access to func
    }
}

//https://stackoverflow.com/questions/41174095/do-i-need-to-use-onload-to-start-my-webpack-bundled-code
export default function ready(fn: () => void) {
    if (document && document.readyState != 'loading') {
        console.log('document.readyState ready!')
        fn()
    } else {
        console.log('DOMContentLoaded listener!')
        // note sure if this is the correct event listener
        document.addEventListener('DOMContentLoaded', fn)
    }
}

ready(render)
