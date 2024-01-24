'use client'

import { GuiContract } from '@/types/ContractOverview'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { ProsopoEnvError } from '@prosopo/common'
import React, { ReactNode, createContext, useContext, useState } from 'react'

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
