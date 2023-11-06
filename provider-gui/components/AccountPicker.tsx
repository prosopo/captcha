'use client'

import { FormControl, FormGroup, MenuItem, Select } from '@mui/material'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { SelectChangeEvent } from '@mui/material/Select'
import { networks } from '@/types/GlobalStateTypes'
import { useEffect, useState } from 'react'
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
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
    const { currentAccount, setCurrentAccount, network, setNetwork } = useGlobalState()

    useEffect(() => {
        const enableExtension = async () => {
            await injected.enable('Prosopo Provider GUI')
            const accounts = await injected.accounts()
            setAccounts(accounts)
            if (accounts.length > 0) setCurrentAccount(accounts[0]?.address ?? '')
        }
        enableExtension()
    }, [])

    const handleAccountChange = (event: SelectChangeEvent<string>) => {
        setCurrentAccount(event.target.value)
    }

    const handleNetworkChange = (event: SelectChangeEvent<'rococo' | 'development'>) => {
        setNetwork(event.target.value as 'rococo' | 'development')
    }

    return (
        <FormGroup>
            <FormControl fullWidth>
                <Select id="account-picker" value={currentAccount} onChange={handleAccountChange}>
                    {accounts.map((account) => (
                        <MenuItem key={account.address} value={account.address}>
                            {account.meta.name} ({account.address})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <Select id="network-picker" value={network} onChange={handleNetworkChange}>
                    {networks.map((network) => (
                        <MenuItem key={network} value={network}>
                            {network}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </FormGroup>
    )
}

export default AccountPicker
