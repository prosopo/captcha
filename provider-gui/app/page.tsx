'use client'

import { Button, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material'
import { GetProviderApi } from '@/services/provider-api/provider-api'
import { useGlobalState } from '@/contexts/PolkadotAccountContext'
import { useRouter } from 'next/navigation'
import React, { FormEvent, useState } from 'react'

interface HomePageState {
    network: string
    providerUrl: string
}

export default function HomePage() {
    const { currentAccount, setCurrentAccount } = useGlobalState()
    const [state, setState] = useState<HomePageState>({ network: 'rococo', providerUrl: '' })
    const router = useRouter()

    async function CheckIfProviderIsRunning(url: string): Promise<boolean> {
        console.log(`Checking if provider at ${url} is running...`)
        const provider = GetProviderApi(url, currentAccount)
        // Request captcha
        // if captcha is give, return true
        // else error, catch error and return false
        return url !== 'notrunning'
    }

    async function CheckIfProviderIsRegistered(
        url: string,
        contractAddress: string,
        network: string,
        accountId: string
    ): Promise<boolean> {
        console.log(`Checking if provider is registered in ${network} network...`)
        return url !== 'notregistered'
        // try {
        //     await getContractApi(accountId)
        //     return true
        // } catch (e) {
        //     return false
        // }
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setState({
            ...state,
            [event.target.name]: event.target.value,
        })
    }

    const handleNetworkChange = (event: SelectChangeEvent<string>) => {
        setState({
            ...state,
            network: event.target.value as string,
        })
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const isProviderRunning = await CheckIfProviderIsRunning(state.providerUrl)
        if (!isProviderRunning) {
            alert('Error: Provider is not running.')
            return
        }

        const isProviderRegistered = await CheckIfProviderIsRegistered(
            state.providerUrl,
            state.network,
            state.providerUrl,
            currentAccount
        )
        if (!isProviderRegistered) {
            alert('Provider is running but not registered.')
            router.push('/register-provider')
            return
        }

        router.push('/provider-profile/profile-summary')
    }

    return (
        <form onSubmit={handleSubmit}>
            <Select value={state.network} onChange={handleNetworkChange}>
                <MenuItem value="rococo">Rococo</MenuItem>
            </Select>
            <TextField label="Provider URL" name="providerUrl" value={state.providerUrl} onChange={handleInputChange} />
            <Button type="submit">Elect Running Provider</Button>
        </form>
    )
}

// Dummy functions. Replace these with actual implementation.
