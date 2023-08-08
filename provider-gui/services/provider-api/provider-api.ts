import { ProviderApi } from '@prosopo/api'
import { useState } from 'react'
import { GlobalState } from '../../types/global-state-types'

export async function getProviderDetails(providerUrl: string, providerAccountId: string, providerDetails: GlobalState) {
    try {
        const response = await getProviderApi(providerUrl, providerAccountId).getProviderDetails()
        return {
            ...providerDetails,
            profile: {
                summary: {
                    balance: response.balance.toNumber(),
                    fee: response.fee,
                    payee: response.payee,
                    status: response.status,
                },
            },
        }
    } catch (error) {
        console.error(`Error: ${error}`)
        return null
    }
}

export const getProviderApi = (providerUrl: string, currentAccount: string) => {
    const network = {
        endpoint: 'wss://rpc.polkadot.io',
        contract: {
            address: 'asdf',
            name: 'captcha_contract',
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
