'use client'

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { useEffect } from 'react'
import { useGlobalState } from '../contexts/GlobalContext'
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp'
import React from 'react'

interface Injected {
    enable: typeof web3Enable
    accounts: typeof web3Accounts
}

const injected: Injected = {
    enable: web3Enable,
    accounts: web3Accounts,
}

const AccountPicker: React.FC = () => {
    const { providerDetails, setProviderDetails } = useGlobalState()

    useEffect(() => {
        const enableExtension = async () => {
            await injected.enable('my cool dapp')
            const accounts = await injected.accounts()
            if (accounts.length > 0) {
                setProviderDetails({ ...providerDetails, accounts, currentAccount: accounts[0].address })
            } else {
                setProviderDetails({ ...providerDetails, accounts })
            }
        }
        enableExtension()
    }, [])

    const handleChange = (event: SelectChangeEvent<string>) => {
        setProviderDetails({ ...providerDetails, currentAccount: event.target.value })
    }

    return (
        <FormControl fullWidth>
            <InputLabel id="account-picker-label">Account</InputLabel>
            <Select
                labelId="account-picker-label"
                id="account-picker"
                value={providerDetails.currentAccount ?? ''}
                label="Account"
                onChange={handleChange}
            >
                {providerDetails.accounts.map((account) => (
                    <MenuItem key={account.address} value={account.address}>
                        {account.meta.name} ({account.address})
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}

export default AccountPicker
