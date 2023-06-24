import { ApiParams } from '@prosopo/types'
import { Procaptcha } from '@prosopo/procaptcha-react'
import { ProcaptchaOutput } from '@prosopo/procaptcha'
import { createRoot } from 'react-dom/client'

function getConfig(siteKey?: string) {
    if (!siteKey) {
        siteKey = process.env.PROSOPO_SITE_KEY || ''
    }
    return {
        userAccountAddress: '',
        web2: true,
        dappName: 'Prosopo',
        network: {
            endpoint: process.env.SUBSTRATE_NODE_URL || 'ws://127.0.0.1:9944',
            contract: {
                address: process.env.PROTOCOL_CONTRACT_ADDRESS || '',
                name: 'prosopo',
            },
            dappAccount: {
                address: siteKey, //prosopo site key
                name: 'dapp',
            },
        },
        solutionThreshold: 80,
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

export function render() {
    const elements: Element[] = Array.from(document.getElementsByClassName('procaptcha'))
    const siteKey = elements[0].getAttribute('data-sitekey') || undefined
    const config = getConfig(siteKey)
    console.log('Config', config)
    for (const element of elements) {
        const callbacks = {
            // add a listener to the onSubmit event of the parent form of element, appending the payload as
            // procaptcha-response
            onHuman: (payload: ProcaptchaOutput) => {
                // get form
                const form = getParentForm(element)
                // add a listener to the onSubmit event of the form
                if (form) {
                    form.addEventListener('submit', (e) => {
                        // add the payload to the form
                        const input = document.createElement('input')
                        input.type = 'hidden'
                        ;(input.name = ApiParams.procaptchaResponse), (input.value = JSON.stringify(payload))
                        form.appendChild(input)
                    })
                }
            },
        }
        const root = createRoot(element)
        root.render(<Procaptcha config={config} callbacks={callbacks} />) //wrap in fn and give user access to func
    }
}

//https://stackoverflow.com/questions/41174095/do-i-need-to-use-onload-to-start-my-webpack-bundled-code
export default function ready(fn) {
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
