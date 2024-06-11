// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
        throw new ProsopoEnvError('ACCOUNT.NO_POLKADOT_EXTENSION')
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
