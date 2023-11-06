import { ProviderApi } from '@prosopo/api'

export const getProviderApi = (providerUrl: string, currentAccount: string) => {
    const network = {
        endpoint: 'wss://rpc.polkadot.io',
        contract: {
            address: 'asdf',
            name: 'asdf',
        },
        pairType: 'sr25519' as const,
        ss58Format: 42,
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
