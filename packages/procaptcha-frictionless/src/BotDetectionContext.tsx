import React, { createContext, useContext, ReactNode } from 'react'
import { load } from '@fingerprintjs/botd'

interface BotDetectionContextType {
    detectBot: () => Promise<{ bot: boolean }>
}

const BotDetectionContext = createContext<BotDetectionContextType | undefined>(undefined)

export const BotDetectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const detectBot = async () => {
        const botd = await load()
        return botd.detect()
    }

    return <BotDetectionContext.Provider value={{ detectBot }}>{children}</BotDetectionContext.Provider>
}

export const useBotDetection = (): BotDetectionContextType => {
    const context = useContext(BotDetectionContext)
    if (context === undefined) {
        throw new Error('useBotDetection must be used within a BotDetectionProvider')
    }
    return context
}
