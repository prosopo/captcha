import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    Typography,
} from '@mui/material'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { providerUpdate } from '@/services/api/api'
import { signedBlockNumberHeaders } from '@/services/provider/provider'
import React, { useState } from 'react'

type ProviderUpdateProps = {
    currentAccount: InjectedAccountWithMeta
    providerBaseUrl: string
}

export const ProviderUpdate: React.FC<ProviderUpdateProps> = ({ currentAccount, providerBaseUrl }) => {
    const [payee, setPayee] = useState('')
    const [url, setUrl] = useState('')
    const [fee, setFee] = useState('')
    const [value, setValue] = useState('')

    const handleFieldChange =
        (setter: React.Dispatch<React.SetStateAction<string>>) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setter(event.target.value)
        }

    const handlePayeeChange = (event: SelectChangeEvent<string>) => {
        setPayee(event.target.value as string)
    }

    const handleUpdateProvider = async () => {
        if (!currentAccount) {
            alert('Please select an account.')
            return
        }

        if (isNaN(Number(fee)) || isNaN(Number(value))) {
            alert('Fee and Value must be numbers.')
            return
        }

        const headers = await signedBlockNumberHeaders(currentAccount)
        const updateData = {
            url,
            address: currentAccount.address,
            ...(fee && { fee }),
            ...(payee && { payee }),
            ...(value && { value }),
        }

        const request = await providerUpdate(providerBaseUrl, headers, updateData)
        return request
    }

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Provider Update
            </Typography>
            <TextField
                fullWidth
                label="URL"
                variant="outlined"
                sx={{ mb: 2 }}
                value={url}
                onChange={handleFieldChange(setUrl)}
            />
            <TextField
                fullWidth
                label="Fee"
                variant="outlined"
                sx={{ mb: 2 }}
                value={fee}
                onChange={handleFieldChange(setFee)}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="payee-label">Payee</InputLabel>
                <Select labelId="payee-label" value={payee} label="Payee" onChange={handlePayeeChange}>
                    <MenuItem value="Dapp">Dapp</MenuItem>
                    <MenuItem value="Provider">Provider</MenuItem>
                </Select>
            </FormControl>
            <TextField
                fullWidth
                label="Value"
                variant="outlined"
                sx={{ mb: 2 }}
                value={value}
                onChange={handleFieldChange(setValue)}
            />
            <Button fullWidth variant="contained" color="primary" onClick={handleUpdateProvider}>
                Update Provider
            </Button>
        </Box>
    )
}
