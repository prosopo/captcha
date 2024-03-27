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

import { web3AccountsSubscribe, web3Enable } from '@polkadot/extension-dapp'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { useTranslation } from '@prosopo/common'
import { useEffect, useState } from 'react'

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
        // react select box
        <select
            id='select-account'
            onChange={(e) => {
                const value = e.target.value
                const account = accounts.find((a) => a.address === value) || null
                if (account) {
                    console.log('Selected account:', value)
                    onChange(account.address)
                } else {
                    console.log('Deselected account')
                    onChange('')
                }
            }}
            value={accounts.length > 0 && account ? account.address : undefined}
            style={{ width: '550px' }}
        >
            {accounts.map(({ address, meta: { name } }) => (
                <option value={address}>{name}</option>
            ))}
        </select>
    )
}
