// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo/procaptcha-react>.
//
// procaptcha-react is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha-react is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha-react.  If not, see <http://www.gnu.org/licenses/>.
import { SyntheticEvent, useEffect, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useTranslation } from '@prosopo/common'
import { web3AccountsSubscribe, web3Enable } from '@polkadot/extension-dapp'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

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
            console.log('subscribe')
            return web3AccountsSubscribe(setAccounts)
        })
        return () => {
            console.log('unsubscribe')
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
