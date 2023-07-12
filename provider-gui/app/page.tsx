'use client'

import { Button, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material'
import { useRouter } from 'next/navigation'
import React, { FormEvent, useState } from 'react'

interface HomePageState {
    network: string
    providerUrl: string
}

export default function HomePage() {
    const [state, setState] = useState<HomePageState>({ network: 'rococo', providerUrl: '' })
    const router = useRouter()

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

        // replace with actual function for checking if provider is running
        const isProviderRunning = await checkIfProviderIsRunning(state.providerUrl)
        if (!isProviderRunning) {
            alert('Error: Provider is not running.')
            return
        }

        // replace with actual function for checking if provider is registered in contract
        const isProviderRegistered = await checkIfProviderIsRegistered(state.network, state.providerUrl)
        if (!isProviderRegistered) {
            alert('Provider is running but not registered.')
            router.push('/register-provider') // Redirect to register provider page
            return
        }

        router.push('/provider-profile') // Redirect to provider profile page
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
async function checkIfProviderIsRunning(url: string): Promise<boolean> {
    console.log(`Checking if provider at ${url} is running...`)
    // Implement your API call here
    return true // This is a dummy value
}

async function checkIfProviderIsRegistered(network: string, url: string): Promise<boolean> {
    console.log(`Checking if provider at ${url} is registered in ${network} network...`)
    // Implement your API call here
    return true // This is a dummy value
}
