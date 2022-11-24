// ../.env | .env.local | .env.development >>
// REACT_APP_API_BASE_URL=http://localhost:3000
// REACT_APP_API_PATH_PREFIX=/v1/prosopo
// REACT_APP_DAPP_CONTRACT_ADDRESS=5FzjruAqyhRGV81pMb4yznNS7t52hNB8u2VC2N1P22j5QLY9
// https://create-react-app.dev/docs/adding-custom-environment-variables/

import { ProsopoClientConfig } from '@prosopo/procaptcha'

const config: ProsopoClientConfig = {
    solutionThreshold: 80,
    web2: process.env.REACT_APP_WEB2 === 'true',
    defaultEnvironment: 'development',
    logLevel: 'info',
    networks: {
        development: {
            endpoint: process.env.REACT_APP_SUBSTRATE_ENDPOINT,
            prosopoContract: {
                address: process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS,
                name: 'prosopo',
            },
            dappContract: {
                address: process.env.REACT_APP_DAPP_CONTRACT_ADDRESS,
                name: 'dapp',
            },
        },
    },
    accountCreator: {
        area: { width: 300, height: 300 },
        offsetParameter: 2001000001,
        multiplier: 15000,
        fontSizeFactor: 1.5,
        maxShadowBlur: 50,
        numberOfRounds: 5,
        seed: 42,
    },
    dappName: 'client-example',
    serverUrl: process.env.REACT_APP_SERVER_URL || '',
}

export default config
