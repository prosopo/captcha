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
'use client'

import { networks } from '@/types/GlobalStateTypes'
import { FormControl, FormGroup, MenuItem, Select } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { useEffect, useState } from 'react'
import type React from 'react'
import { useGlobalState } from '../contexts/GlobalContext'

const AccountPicker: React.FC = () => {
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
    const { currentAccount, setCurrentAccount, network, setNetwork } = useGlobalState()

    useEffect(() => {
        const enableExtension = async () => {
            await web3Enable('Prosopo Provider GUI')
            const accounts = await web3Accounts()
            setAccounts(accounts)
            if (accounts.length > 0 && accounts[0]) setCurrentAccount(accounts[0])
        }
        enableExtension()
    }, [])

    const handleAccountChange = (event: SelectChangeEvent<InjectedAccountWithMeta>) => {
        const account = accounts.find((account) => account.address === event.target.value)
        if (account) setCurrentAccount(account)
    }

    const handleNetworkChange = (event: SelectChangeEvent<'rococo' | 'development'>) => {
        setNetwork(event.target.value as 'rococo' | 'development')
    }

    return (
        <FormGroup>
            <FormControl fullWidth>
                <Select id='account-picker' value={currentAccount} onChange={handleAccountChange}>
                    {accounts.map((account) => (
                        <MenuItem key={account.address} value={account.address}>
                            {account.meta.name} ({account.address})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <Select id='network-picker' value={network} onChange={handleNetworkChange}>
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
