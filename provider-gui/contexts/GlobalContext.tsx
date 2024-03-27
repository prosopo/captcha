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

import type { GuiContract } from '@/types/ContractOverview'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { ProsopoEnvError } from '@prosopo/common'
import type React from 'react'
import { type ReactNode, createContext, useContext, useState } from 'react'

interface GlobalStateContextProps {
    currentAccount: InjectedAccountWithMeta | undefined
    setCurrentAccount: (updateStr: InjectedAccountWithMeta) => void
    network: 'rococo' | 'development'
    setNetwork: (updateStr: 'rococo' | 'development') => void
    contracts: GuiContract[]
    setContracts: (newContract: GuiContract[]) => void
}

const GlobalStateContext = createContext<GlobalStateContextProps>({
    currentAccount: undefined,
    setCurrentAccount: () => void 0,
    network: 'rococo',
    setNetwork: () => void 0,
    contracts: [],
    setContracts: () => void 0,
})

interface GlobalStateProviderProps {
    children: ReactNode
}

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({ children }) => {
    const [currentAccount, setCurrentAccount] = useState<InjectedAccountWithMeta | undefined>(undefined)
    const [network, setNetwork] = useState<'rococo' | 'development'>('rococo' as const)
    const [contracts, setContracts] = useState<GuiContract[]>([])

    return (
        <GlobalStateContext.Provider
            value={{
                currentAccount,
                setCurrentAccount,
                network,
                setNetwork,
                contracts,
                setContracts,
            }}
        >
            {children}
        </GlobalStateContext.Provider>
    )
}

export const useGlobalState = () => {
    const context = useContext(GlobalStateContext)
    if (context === undefined) {
        throw new ProsopoEnvError('CONFIG.CONFIGURATIONS_LOAD_FAILED')
    }
    return context
}
