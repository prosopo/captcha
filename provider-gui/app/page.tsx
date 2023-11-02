'use client'

import { Button, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material'
import { getProviderApi } from '../services/provider-api/provider-api'
import { useGlobalState } from '../contexts/GlobalContext'
import { useRouter } from 'next/navigation'
import React, { FormEvent, useState } from 'react'

interface HomePageState {
    network: string
    providerUrl: string
}

const HomePage: React.FC = () => {
    const { currentAccount } = useGlobalState()
    const [state, setState] = useState<HomePageState>({ network: 'rococo', providerUrl: '' })
    const router = useRouter()

    const checkIfProviderIsRunning = (url: string): boolean => {
        console.log(`Checking if provider at ${url} is running...`)
        const provider = getProviderApi(url, currentAccount)
        // Request captcha
        // if captcha is give, return true
        // else error, catch error and return false
        return url !== 'notrunning'
    }

    const checkIfProviderIsRegistered = (
        url: string,
        contractAddress: string,
        network: string,
        accountId: string
    ): boolean => {
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

        const isProviderRunning = await checkIfProviderIsRunning(state.providerUrl)
        if (!isProviderRunning) {
            alert('Error: Provider is not running.')
            return
        }

        const isProviderRegistered = await checkIfProviderIsRegistered(
            state.providerUrl,
            state.network,
            state.providerUrl,
            currentAccount
        )
        if (!isProviderRegistered) {
            alert('Provider is running but not registered.')
            router.push('/register')
            return
        }

        router.push('/profile/summary')
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

export default HomePage
