import { ContractPromise } from '@polkadot/api-contract'
import { ApiPromise } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { WsProvider } from '@polkadot/rpc-provider'

async function getUserBalance() {
    const Key1 = new Keyring({ type: 'sr25519' })
    const UserKey = Key1.addFromMnemonic(
        'puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant'
    )
    const gl = 2000000000
    const polkaProvider = new WsProvider('wss://rococo-contracts-rpc.polkadot.io/')
    const api = await ApiPromise.create({ provider: polkaProvider })
    const nonce = await api.query.system.account(UserKey.address)
    const bal = await api.query.balances.account(UserKey.address)
    const contract = new ContractPromise(api, inc_meta, '5DVAK9xZSEiJzWCdZGNkUjWVuXHJEgtZDgELiqYZEKwaHz2m')
    const x = await contract.query.get(UserKey.address, { gasLimit: gl })
    x.result.toHuman()
}
