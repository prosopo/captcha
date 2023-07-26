'use client'

import { GlobalState } from '../types/global-state-types'
import React, { ReactNode, createContext, useContext, useState } from 'react'

interface GlobalStateContextProps {
    providerDetails: GlobalState
    setProviderDetails: React.Dispatch<React.SetStateAction<GlobalState>>
}

const GlobalStateContext = createContext<GlobalStateContextProps | undefined>(undefined)

interface GlobalStateProviderProps {
    children: ReactNode
}

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({ children }) => {
    const [providerDetails, setProviderDetails] = useState<GlobalState>({ profile: {}, accounts: [] })

    return (
        <GlobalStateContext.Provider value={{ providerDetails, setProviderDetails }}>
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
