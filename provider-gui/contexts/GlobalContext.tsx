'use client'

import { GuiContract } from '@/types/ContractOverview'
import { ProsopoEnvError } from '@prosopo/common'
import React, { ReactNode, createContext, useContext, useState } from 'react'

interface GlobalStateContextProps {
    currentAccount: string
    setCurrentAccount: (updateStr: string) => void
    network: 'rococo' | 'development'
    setNetwork: (updateStr: 'rococo' | 'development') => void
    contracts: GuiContract[]
    setContracts: (newContract: GuiContract[]) => void
}

const GlobalStateContext = createContext<GlobalStateContextProps>({
    currentAccount: '',
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
    const [currentAccount, setCurrentAccount] = useState<string>('')
    const [network, setNetwork] = useState<'rococo' | 'development'>('rococo' as const)
    const [contracts, setContracts] = useState<GuiContract[]>([])

    return (
        <GlobalStateContext.Provider
            value={{ currentAccount, setCurrentAccount, network, setNetwork, contracts, setContracts }}
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
