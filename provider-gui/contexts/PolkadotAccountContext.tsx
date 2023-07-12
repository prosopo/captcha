'use client'

import React, { ReactNode, createContext, useContext, useState } from 'react'

interface GlobalStateContextProps {
    currentAccount: string
    setCurrentAccount: React.Dispatch<React.SetStateAction<string>>
}

const GlobalStateContext = createContext<GlobalStateContextProps | undefined>(undefined)

interface GlobalStateProviderProps {
    children: ReactNode
}

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({ children }) => {
    const [currentAccount, setCurrentAccount] = useState<string>('')

    return (
        <GlobalStateContext.Provider value={{ currentAccount, setCurrentAccount }}>
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
