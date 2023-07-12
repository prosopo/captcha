import { ProviderApi } from '@prosopo/api'
import { useGlobalState } from '@/contexts/PolkadotAccountContext'

const useProviderApi = (providerUrl: string) => {
    const { currentAccount } = useGlobalState()
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
