import { ProviderApi } from '@prosopo/captcha'

export const getProviderApi = (providerUrl: string, currentAccount: string) => {
    const network = {
        endpoint: 'wss://rpc.polkadot.io',
        contract: {
            address: 'asdf',
            name: 'asdf',
        },
        accounts: [''],
    }
    return new ProviderApi(network, providerUrl, currentAccount)
}

export const checkProviderActive = (providerUrl: string, providerAccountId: string) => {
    //todo - this calls the to be build provider status api
    const provider = {
        providerAccount: providerAccountId,
        provider: {},
        blockNumber: 0,
    }
}

// todo, auth with provider by sending signed payload, valid for x blocks
