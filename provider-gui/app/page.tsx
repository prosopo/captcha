'use client'

import { Box, Button, Dialog, MenuItem, Select, SelectChangeEvent, TextField, Typography } from '@mui/material'
import { getProviderApi } from '../services/provider-api/provider-api'
import { useGlobalState } from '../contexts/GlobalContext'
import { useRouter } from 'next/navigation'
import React, { FormEvent, useState } from 'react'

interface HomePageState {
    network: string
    providerUrl: string
}

const HomePage: React.FC = () => {
    const { providerDetails, setProviderDetails } = useGlobalState()
    const [state, setState] = useState<HomePageState>({ network: 'rococo', providerUrl: '' })
    const [isFormVisible, setIsFormVisible] = useState(false)
    const [isDialogVisible, setIsDialogVisible] = useState(false)
    const router = useRouter()

    const checkIfProviderIsRunning = (url: string): boolean => {
        console.log(`Checking if provider at ${url} is running...`)

        if (!providerDetails.currentAccount) {
            return false
        }

        const provider = getProviderApi(url, providerDetails.currentAccount)
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

        if (!providerDetails.currentAccount) {
            return false
        }

        const isProviderRegistered = await checkIfProviderIsRegistered(
            state.providerUrl,
            state.network,
            state.providerUrl,
            providerDetails.currentAccount
        )

        if (!isProviderRegistered) {
            alert('Provider is running but not registered.')
            router.push('/register')
            return
        }

        router.push('/profile/summary')
    }

    const handleYesClick = () => {
        setIsFormVisible(true)
    }

    const handleNoClick = () => {
        setIsDialogVisible(true)
    }

    const handleDialogClose = () => {
        setIsDialogVisible(false)
    }

    return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
            {!isFormVisible && !isDialogVisible && (
                <>
                    <Typography variant="h6">Have you got a running provider which you know the address of?</Typography>
                    <Box marginTop={2}>
                        <Button variant="contained" size="large" onClick={handleYesClick} style={{ margin: '10px' }}>
                            Yes
                        </Button>
                        <Button variant="contained" size="large" onClick={handleNoClick} style={{ margin: '10px' }}>
                            No
                        </Button>
                    </Box>
                </>
            )}

            {isFormVisible && (
                <form onSubmit={handleSubmit}>
                    <Box>
                        <Select value={state.network} onChange={handleNetworkChange}>
                            <MenuItem value="rococo">Rococo</MenuItem>
                        </Select>
                        <TextField
                            label="Provider URL"
                            name="providerUrl"
                            value={state.providerUrl}
                            onChange={handleInputChange}
                        />
                        <Button type="submit">Select Provider URL</Button>
                    </Box>
                </form>
            )}

            <Dialog open={isDialogVisible} onClose={handleDialogClose}>
                <Typography padding="2rem">
                    Before using this GUI, you&apos;ll need to get a provider running. Follow the documentation outlined
                    here https://github.com/prosopo/captcha
                </Typography>
            </Dialog>
        </Box>
    )
}

export default HomePage
