'use client'

import React, { ReactNode, createContext, useContext, useState } from 'react'

interface GlobalStateContextProps {
    currentAccount: string
    setCurrentAccount: (updateStr: string) => void
    network: 'rococo' | 'development'
    setNetwork: (updateStr: 'rococo' | 'development') => void
}

const GlobalStateContext = createContext<GlobalStateContextProps>({
    currentAccount: '',
    setCurrentAccount: () => void 0,
    network: 'rococo',
    setNetwork: () => void 0,
})

interface GlobalStateProviderProps {
    children: ReactNode
}

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({ children }) => {
    const [currentAccount, setCurrentAccount] = useState<string>('')
    const [network, setNetwork] = useState<'rococo' | 'development'>('rococo' as const)

    return (
        <GlobalStateContext.Provider value={{ currentAccount, setCurrentAccount, network, setNetwork }}>
            {children}
        </GlobalStateContext.Provider>
    )
}

export const useGlobalState = () => {
    const context = useContext(GlobalStateContext)
    if (context === undefined) {
        throw new Error('useGlobalState must be used within a GlobalStateProvider')
    }
    return context
}
