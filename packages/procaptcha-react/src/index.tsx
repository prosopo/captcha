import ReactDOM from 'react-dom'
import { Procaptcha } from './components/Procaptcha'
import { ExtensionAccountSelect as ExtensionAccountSelectImport } from './components/ExtensionAccountSelect'

export const ExtensionAccountSelect = ExtensionAccountSelectImport

function renderComponent(config) {
    ReactDOM.render(<Procaptcha config={config} />, document.getElementById('procaptcha')) //wrap in fn and give user access to func
}

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

//https://stackoverflow.com/questions/41174095/do-i-need-to-use-onload-to-start-my-webpack-bundled-code
export function readyChecker(fn) {
    console.log(window.location.href)
    const config = getConfig()
    if (document.readyState != 'loading') {
        console.log('ready!')
        fn(config)
    } else {
        console.log('DOMContentLoaded listener!')
        // note sure if this is the correct event listener
        document.addEventListener('DOMContentLoaded', fn)
    }
}

export default function render() {
    // // if main.js is loaded directly, call ready() function
    if (!checkScript('procaptcha')) {
        readyChecker(renderComponent)
    }
}
