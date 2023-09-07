// Copyright 2021-2023 Prosopo (UK) Ltd.
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

import { Autocomplete, TextField } from '@mui/material'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { SyntheticEvent, useEffect, useState } from 'react'
import { useTranslation } from '@prosopo/common'
import { web3AccountsSubscribe, web3Enable } from '@polkadot/extension-dapp'
// import Autocomplete from '@mui/material/Autocomplete/Autocomplete.js'
// import TextField from '@mui/material/TextField/TextField.js'

export const ExtensionAccountSelect = ({
    value,
    dappName,
    onChange,
}: {
    value?: string
    dappName: string
    onChange: (value: string) => void
}) => {
    const { t } = useTranslation()
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])

    useEffect(() => {
        const prom = web3Enable(dappName).then(() => {
            return web3AccountsSubscribe(setAccounts)
        })
        return () => {
            prom.then((unsub) => unsub())
        }
    }, [])

    const account: InjectedAccountWithMeta | null = accounts.find((a) => a.address === value) || null

    return (
        <Autocomplete
            disablePortal
            id="select-account"
            options={accounts}
            value={account}
            isOptionEqualToValue={(option, value) => option.address === value.address}
            onChange={(event: SyntheticEvent<Element, Event>, value: InjectedAccountWithMeta | null) => {
                if (value) {
                    console.log('Selected account:', value)
                    onChange(value.address)
                } else {
                    console.log('Deselected account')
                    onChange('')
                }
            }}
            sx={{ width: 550 }}
            getOptionLabel={(option: InjectedAccountWithMeta) => `${option.meta.name}: ${option.address}`}
            renderInput={(props) => <TextField {...props} label={t('WIDGET.SELECT_ACCOUNT')} />}
        />
    )
}

export default ExtensionAccountSelect
