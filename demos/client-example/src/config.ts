// ../.env | .env.local | .env.development >>
// REACT_APP_API_BASE_URL=http://localhost:3000
// REACT_APP_API_PATH_PREFIX=/v1/prosopo
// REACT_APP_DAPP_CONTRACT_ADDRESS=5FzjruAqyhRGV81pMb4yznNS7t52hNB8u2VC2N1P22j5QLY9
// https://create-react-app.dev/docs/adding-custom-environment-variables/

import { ProsopoConfig } from '@prosopo/procaptcha';

const config: ProsopoConfig = {
    // "providerApi.baseURL": process.env.REACT_APP_API_BASE_URL,
    // "providerApi.prefix": process.env.REACT_APP_API_PATH_PREFIX,
    // "dappAccount": process.env.REACT_APP_DAPP_CONTRACT_ADDRESS,
    "providerApi.baseURL": "http://localhost:3000",
    "providerApi.prefix": "/v1/prosopo",
    "dappAccount": "5CGUZ7DpzzRMGKVyuLyD2az9VLbngbMc6SuuKzPiGqwoDGR6",
}

export default config;
