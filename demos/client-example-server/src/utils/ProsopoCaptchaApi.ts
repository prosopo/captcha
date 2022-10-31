import {ProsopoCaptchaConfig} from "@prosopo/procaptcha";
import {ProviderApi} from "@prosopo/api";

const config: ProsopoCaptchaConfig = {
    "providerApi.prefix": process.env.REACT_APP_API_PATH_PREFIX || '',
    "dappAccount": process.env.REACT_APP_DAPP_CONTRACT_ADDRESS || '',
    "dappUrl": process.env.REACT_APP_DAPP_CONTRACT_URL || '',
    "solutionThreshold": 80,
    "web2": process.env.REACT_APP_WEB2 === "true",
    "prosopoContractAccount": process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS || '',
    "accountCreator": {
        "area" : {width: 300, height: 300},
        "offsetParameter" : 2001000001,
        "multiplier" : 15000,
        "fontSizeFactor" : 1.5,
        "maxShadowBlur" : 50,
        "numberOfRounds" : 5,
        "seed" : 42
    },
    "dappName": "prosopo",
    "serverUrl": process.env.REACT_APP_SERVER_URL || ''
}


async function getProviderApi(providerUrl: string) {
    return new ProviderApi(config,  providerUrl);
}

export async function isVerified (providerUrl: string, web3Account: string, commitmentId: string): Promise<boolean> {
    const providerApi = await getProviderApi(providerUrl);
    const result = await providerApi.verifySolution(web3Account, commitmentId);
    return result.solutionApproved
}
