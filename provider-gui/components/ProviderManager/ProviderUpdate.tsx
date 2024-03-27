import { providerUpdate } from '@/services/api/api'
import { signedBlockNumberHeaders } from '@/services/provider/provider'
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
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    type SelectChangeEvent,
    TextField,
    Typography,
} from '@mui/material'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import type React from 'react'
import { useState } from 'react'

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

        if (Number.isNaN(Number(fee)) || Number.isNaN(Number(value))) {
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
            <Typography variant='h6' sx={{ mb: 2 }}>
                Provider Update
            </Typography>
            <TextField
                fullWidth
                label='URL'
                variant='outlined'
                sx={{ mb: 2 }}
                value={url}
                onChange={handleFieldChange(setUrl)}
            />
            <TextField
                fullWidth
                label='Fee'
                variant='outlined'
                sx={{ mb: 2 }}
                value={fee}
                onChange={handleFieldChange(setFee)}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id='payee-label'>Payee</InputLabel>
                <Select labelId='payee-label' value={payee} label='Payee' onChange={handlePayeeChange}>
                    <MenuItem value='Dapp'>Dapp</MenuItem>
                    <MenuItem value='Provider'>Provider</MenuItem>
                </Select>
            </FormControl>
            <TextField
                fullWidth
                label='Value'
                variant='outlined'
                sx={{ mb: 2 }}
                value={value}
                onChange={handleFieldChange(setValue)}
            />
            <Button fullWidth variant='contained' color='primary' onClick={handleUpdateProvider}>
                Update Provider
            </Button>
        </Box>
    )
}
