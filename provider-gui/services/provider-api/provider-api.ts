import { ProviderApi } from '@prosopo/api'
import { useGlobalState } from '@/contexts/PolkadotAccountContext'

export const GetProviderApi = (providerUrl: string, currentAccount: string) => {
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

export const CheckProviderActive = (providerUrl: string, providerAccountId: string) => {
    const provider = {
        providerAccount: providerAccountId,
        provider: {},
        blockNumber: 0,
    }
}
