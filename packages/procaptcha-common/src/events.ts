import { ProcaptchaCallbacks, ProcaptchaEvents, ProcaptchaState, ProcaptchaStateUpdateFn } from '@prosopo/types'
import { ProsopoError } from '@prosopo/common'

const alertError = (error: ProsopoError) => {
    alert(error.message)
}

export const getDefaultEvents = (
    stateUpdater: ProcaptchaStateUpdateFn,
    state: ProcaptchaState,
    callbacks: ProcaptchaCallbacks
): ProcaptchaEvents => {
    return Object.assign(
        {
            onError: alertError,
            onHuman: (output: { user: string; dapp: string; commitmentId?: string; providerUrl?: string }) => {
                stateUpdater({ sendData: !state.sendData })
            },
            onExtensionNotFound: () => {
                alert('No extension found')
            },
            onFailed: () => {
                alert('Captcha challenge failed. Please try again')
                stateUpdater({ sendData: !state.sendData })
            },
            onExpired: () => {
                alert('Completed challenge has expired, please try again')
            },
            onChallengeExpired: () => {
                alert('Uncompleted challenge has expired, please try again')
            },
            onOpen: () => {},
            onClose: () => {},
        },
        callbacks
    )
}
