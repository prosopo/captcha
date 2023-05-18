import ReactDOM from 'react-dom'
import { Procaptcha } from './components/Procaptcha'

let siteKey
if (document && document.currentScript && 'src' in document.currentScript) {
    const src = document.currentScript.src
    siteKey = decodeURI(src).split('render=')[1].split('&')[0]
} else {
    siteKey = process.env.DAPP_CONTRACT_ADDRESS
}

const config = {
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

export function render() {
    ReactDOM.render(<Procaptcha config={config} />, document.getElementById('procaptcha')) //wrap in fn and give user access to func
}

//https://stackoverflow.com/questions/41174095/do-i-need-to-use-onload-to-start-my-webpack-bundled-code
export function ready(fn) {
    console.log(window.location.href)
    if (document.readyState != 'loading') {
        console.log('ready!')
        fn()
    } else {
        console.log('DOMContentLoaded listener!')
        // note sure if this is the correct event listener
        document.addEventListener('DOMContentLoaded', fn)
    }
}

ready(render)
