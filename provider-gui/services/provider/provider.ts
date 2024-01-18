import { ApiPromise, WsProvider } from '@polkadot/api'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { ProsopoEnvError } from '@prosopo/common'
import { stringToHex } from '@polkadot/util'
import { web3Enable, web3FromSource } from '@polkadot/extension-dapp'

export const signedBlockNumberHeaders = async (currentAccount: InjectedAccountWithMeta) => {
    const blocknumber = await getCurrentBlockNumber()
    const signature = await signedBlockNumber(currentAccount)

    return {
        blocknumber: blocknumber.toString(),
        signature,
    }
}

const signedBlockNumber = async (currentAccount: InjectedAccountWithMeta) => {
    try {
        return await signMessage(currentAccount)
    } catch (error) {
        console.error('Error in signedBlockNumber:', error)
        throw error
    }
}

const signMessage = async (currentAccount: InjectedAccountWithMeta) => {
    if (!currentAccount) {
        throw new ProsopoEnvError('GENERAL.CANT_FIND_KEYRINGPAIR')
    }

    web3Enable('Provider GUI')

    const injector = await web3FromSource(currentAccount.meta.source)
    const signRaw = injector?.signer?.signRaw

    if (!signRaw) {
        throw new ProsopoEnvError('PROGUI.NO_POLKADOT_EXTENSION')
    }

    const blockNumberString = (await getCurrentBlockNumber()).toString()

    const signedData = await signRaw({
        address: currentAccount.address,
        data: stringToHex(blockNumberString),
        type: 'bytes',
    })

    return signedData.signature
}

const getCurrentBlockNumber = async () => {
    try {
        const api = await getApi()
        return (await api.rpc.chain.getBlock()).block.header.number.toNumber()
    } catch (error) {
        console.error('Error in getCurrentBlockNumber:', error)
        throw error
    }
}

const getApi = async () => {
    const endpoint = 'ws://127.0.0.1:9944'
    const wsProvider = new WsProvider(endpoint)
    try {
        return await ApiPromise.create({ provider: wsProvider, initWasm: false })
    } catch (error) {
        console.error('Error in getApi:', error)
        throw error
    }
}
