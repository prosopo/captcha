// ../.env | .env.local | .env.development >>
// REACT_APP_API_BASE_URL=http://localhost:8282
// REACT_APP_API_PATH_PREFIX=/v1/prosopo
// REACT_APP_DAPP_CONTRACT_ADDRESS=5FzjruAqyhRGV81pMb4yznNS7t52hNB8u2VC2N1P22j5QLY9
// https://create-react-app.dev/docs/adding-custom-environment-variables/

import { ProsopoCaptchaConfig } from '@prosopo/procaptcha'

const config: ProsopoCaptchaConfig = {
    'providerApi.baseURL': process.env.NEXT_PUBLIC_API_BASE_URL || '',
    'providerApi.prefix': process.env.NEXT_PUBLIC_API_PATH_PREFIX || '',
    dappAccount: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
    dappUrl: process.env.NEXT_PUBLIC_CONTRACT_URL || '',
    solutionThreshold: 80,
    web2: process.env.NEXT_PUBLIC_WEB2 === 'true',
    prosopoContractAccount: process.env.NEXT_PUBLIC_PROSOPO_CONTRACT_ADDRESS || '',
    accountCreator: {
        area: { width: 300, height: 300 },
        offsetParameter: 2001000001,
        multiplier: 15000,
        fontSizeFactor: 1.5,
        maxShadowBlur: 50,
        numberOfRounds: 5,
        seed: 42,
    },
    dappName: process.env.NEXT_PUBLIC_DAPP_NAME || '',
}

export default config
