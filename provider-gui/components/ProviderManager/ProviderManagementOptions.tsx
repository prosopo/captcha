import {
    Box,
    Button,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    Typography,
} from '@mui/material'
import { signedBlockNumberHeaders } from '@/services/provider-api/provider-api'
import { useGlobalState } from '@/contexts/GlobalContext'
import React, { useState } from 'react'

type ProviderManagementOptionsProps = {
    onBack: () => void // Prop for the callback function
}

export const ProviderManagementOptions: React.FC<ProviderManagementOptionsProps> = ({ onBack }) => {
    const [payee, setPayee] = useState('')
    const [url, setUrl] = useState('')
    const [fee, setFee] = useState('')
    const [value, setValue] = useState('')

    const { currentAccount } = useGlobalState()

    const handlePayeeChange = (event: SelectChangeEvent<string>) => {
        setPayee(event.target.value as string)
    }

    const handleUpdateProvider = async () => {
        if (!currentAccount) {
            alert('Please select an account.')
            return
        }
        const signedHeaders = await signedBlockNumberHeaders(currentAccount)

        console.log(signedHeaders)
        // Validate fee and value
        if (isNaN(Number(fee)) || isNaN(Number(value))) {
            alert('Fee and Value must be numbers.')
            return
        }

        // TODO: Implement update provider logic
        console.log({ url, fee, payee, value })
    }

    return (
        <Box>
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
                    onChange={(e) => setUrl(e.target.value)}
                />
                <TextField
                    fullWidth
                    label="Fee"
                    variant="outlined"
                    sx={{ mb: 2 }}
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
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
                    onChange={(e) => setValue(e.target.value)}
                />

                <Button fullWidth variant="contained" color="primary" onClick={handleUpdateProvider}>
                    Update Provider
                </Button>
            </Box>

            <Divider sx={{ mb: 4 }} />

            <Button fullWidth variant="contained" color="primary">
                Batch Commit
            </Button>

            <Divider sx={{ mb: 4 }} />
            <Divider sx={{ mb: 4 }} />

            <Button fullWidth variant="contained" color="error" sx={{ mb: 4 }}>
                Provider Deregister
            </Button>

            <Divider />

            <Button fullWidth variant="outlined" color="primary" onClick={onBack} sx={{ mt: 4 }}>
                Back to Details
            </Button>
        </Box>
    )
}
