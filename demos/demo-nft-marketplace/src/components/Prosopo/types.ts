import { PropsWithChildren, ReactNode } from 'react'
import { ProsopoCaptchaClient } from '@prosopo/procaptcha'

export type ShowCaptchasState = {
    captchasVisible: boolean
    showCaptchas: (callback?: (approved: boolean) => Promise<void>) => void
    clientInterface?: ProsopoCaptchaClient
    showWalletModal: () => void
    showFaucetModal: () => void
    captchaReloadKey: number
    loading: boolean
}

export type ConsumerProps = {
    children(options: ShowCaptchasState): ReactNode
}

export type ProviderProps = PropsWithChildren<{}>
