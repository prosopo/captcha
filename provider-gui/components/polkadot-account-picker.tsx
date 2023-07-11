import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { SelectChangeEvent } from '@mui/material/Select'
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp'
import React, { useEffect, useState } from 'react'

interface Injected {
    enable: typeof web3Enable
    accounts: typeof web3Accounts
}

const injected: Injected = {
    enable: web3Enable,
    accounts: web3Accounts,
}

export default function PolkadotAccountPicker() {
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
    const [selectedAccount, setSelectedAccount] = useState<string>('')

    useEffect(() => {
        const enableExtension = async () => {
            await injected.enable('my cool dapp')
            const accounts = await injected.accounts()
            setAccounts(accounts)
            if (accounts.length > 0) setSelectedAccount(accounts[0].address)
        }
        enableExtension()
    }, [])

    const handleChange = (event: SelectChangeEvent<string>) => {
        setSelectedAccount(event.target.value)
    }

    return (
        <FormControl fullWidth>
            <InputLabel id="account-picker-label">Account</InputLabel>
            <Select
                labelId="account-picker-label"
                id="account-picker"
                value={selectedAccount}
                label="Account"
                onChange={handleChange}
            >
                {accounts.map((account) => (
                    <MenuItem key={account.address} value={account.address}>
                        {account.meta.name} ({account.address})
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
