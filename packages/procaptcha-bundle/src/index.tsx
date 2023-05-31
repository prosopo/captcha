import { Procaptcha } from '@prosopo/procaptcha-react'
import ReactDOM from 'react-dom'

function currentScript(): HTMLScriptElement | undefined {
    if (
        document &&
        document.currentScript &&
        'src' in document.currentScript &&
        document.currentScript.src !== undefined
    ) {
        return document.currentScript
    }
    return undefined
}
function checkScript(name: string): HTMLScriptElement | undefined {
    const script = currentScript()
    console.log(script)
    if (script && script.src.indexOf(`${name}.js`) !== -1) {
        return script
    } else {
        return undefined
    }
}

function getConfig() {
    let siteKey
    const procaptchaScript = checkScript('procaptcha')
    if (procaptchaScript) {
        const src = procaptchaScript.src
        siteKey = decodeURI(src).split('render=')[1].split('&')[0]
    } else {
        siteKey = process.env.DAPP_CONTRACT_ADDRESS
    }
    return {
        userAccountAddress: '',
        web2: true,
        dappName: 'Prosopo',
        network: {
            endpoint: 'ws://127.0.0.1:9944',
            prosopoContract: {
                address: process.env.PROTOCOL_CONTRACT_ADDRESS || '',
                name: 'prosopo',
            },
            dappContract: {
                address: siteKey, //prosopo site key
                name: 'dapp',
            },
        },
        solutionThreshold: 80,
    }
}

export function render() {
    const config = getConfig()
    ReactDOM.render(<Procaptcha config={config} />, document.getElementById('procaptcha')) //wrap in fn and give user access to func
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
