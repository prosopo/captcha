import { CaptchaContextManager, useCaptcha } from '@prosopo/procaptcha-react'
import { FC, createContext, useEffect, useState } from 'react'
import {
    IExtensionInterface,
    TCaptchaSubmitResult,
    TExtensionAccount,
    getExtension,
    getWsProvider,
} from '@prosopo/procaptcha'
import toast, { ToastBar, Toaster } from 'react-hot-toast'

import { ConsumerProps, ProviderProps, ShowCaptchasState } from './types'
import { FaucetModal, WalletModal } from 'components/Modal'
import { formatPrice } from 'api/demoApi'
import config from 'config'

const CustomContext = createContext<ShowCaptchasState>({
    captchasVisible: false,
    showCaptchas: () => {
        console.log('implement showCaptchas')
    },
    showWalletModal: () => {
        console.log('implement showWalletModal')
    },
    showFaucetModal: () => {
        console.log('implement showFaucetModal')
    },
    captchaReloadKey: 0,
    loading: true,
})

export const ProsopoProvider: FC<ProviderProps> = ({ children }) => {
    const [showCaptchas, setShowCaptchas] = useState(false)
    const [loading, setLoading] = useState(true)
    const [onSolvedCallback, setOnSolvedCallback] = useState<(approved: boolean) => Promise<void>>(async () => {
        return
    })
    const [walletModalOpen, setWalletModalOpen] = useState(false)
    const [faucetModalOpen, setFaucetModalOpen] = useState(false)
    const [captchaReloadKey, setCaptchaReloadKey] = useState<number>(0)

    const onAccountChange = (account: TExtensionAccount) => {
        if (!account) {
            clientInterface.getExtension()?.unsetAccount()
        }
        status.update({ info: 'Selected account: ' + account?.meta.name })
        const captchaApi = clientInterface.getCaptchaApi()
        console.log('CAPTCHA API', captchaApi)
        if ((captchaApi?.['provider'] as any)?.Err) {
            toast.error((captchaApi['provider'] as any).Err)
        }
    }

    const onSubmit = (submitResult: TCaptchaSubmitResult | Error) => {
        if (submitResult instanceof Error) {
            status.update({ error: ['onSubmit: CAPTCHA SUBMIT ERROR', submitResult] })
            toast.error(`Error: ${submitResult.message}`)
            return
        }
        const [result, tx] = submitResult
        const txHash = tx ? tx.txHash.toHuman().toString() : ''

        status.update({ info: ['onSubmit: CAPTCHA SUBMIT STATUS', result.status] })
        toast.loading('Loading ...', { id: txHash })
    }

    const onSolved = ([result, tx, commitment]: TCaptchaSubmitResult, isHuman: boolean | undefined) => {
        console.log({ isHuman })
        setShowCaptchas(!isHuman)
        status.update({
            info: ['onSolved:', `Captcha solution status: ${commitment ? commitment.status : result.solutionApproved}`],
        })
        const txHash = tx ? tx.txHash.toHuman().toString() : ''
        if (manager.state.config['web2'] === false) {
            if (commitment.status == 'Approved') {
                toast.success(
                    `Solution Approved! You've gained reputation. ${formatPrice(result.partialFee)} refunded.`,
                    {
                        id: txHash,
                    }
                )
                onSolvedCallback(true)
            } else {
                toast.error(
                    `Solution Disapproved! You've lost some reputation. ${formatPrice(result.partialFee)} lost.`,
                    {
                        id: txHash,
                    }
                )
                onSolvedCallback(false)
            }
            if (!isHuman || commitment.status != 'Approved') {
                setCaptchaReloadKey(Date.now())
            }
        } else {
            onSolvedCallback(result.solutionApproved)
            if (!result.solutionApproved) {
                setCaptchaReloadKey(Date.now())
            }
        }
    }

    const onChange = (solution: string[][]) => {
        console.log('onChange:', solution)
    }

    const onCancel = () => {
        setShowCaptchas(false)
        status.update({ info: '' })
    }

    const clientInterface = useCaptcha({ config }, { onAccountChange, onChange, onSubmit, onSolved, onCancel })

    const manager = clientInterface.manager
    const status = clientInterface.status
    console.log(manager.state.config)

    useEffect(() => {
        getExtension(
            getWsProvider(manager.state.config['dappUrl']),
            manager.state.config['web2'],
            manager.state.config['accountCreator'],
            manager.state.config['dappName']
        )
            .then(async (extension: IExtensionInterface) => {
                clientInterface.setExtension(extension)
                if (manager.state.config['web2']) {
                    await extension.createAccount()
                }
                const defaultAddress = extension.getDefaultAccount()?.address
                const currUser = extension.getAccounts().find(({ address }) => address == defaultAddress)

                if (currUser) {
                    await clientInterface.onAccountChange(currUser)
                }

                setLoading(false)
            })
            .catch((err) => {
                if (err.message != 'No extension found') {
                    console.error(err)
                }
                setWalletModalOpen(true)
            })
    }, [])

    return (
        <CustomContext.Provider
            value={{
                captchasVisible: showCaptchas,
                showCaptchas: (callback) => {
                    setShowCaptchas(true)
                    if (callback) {
                        setOnSolvedCallback((approved) => () => {
                            return callback(approved)
                        })
                    }
                },
                clientInterface,
                showWalletModal: () => setWalletModalOpen(true),
                showFaucetModal: () => setFaucetModalOpen(true),
                captchaReloadKey,
                loading,
            }}
        >
            <CaptchaContextManager.Provider value={manager}>
                {children}
                <Toaster position="top-right" toastOptions={{ duration: 6000 }}>
                    {(t) => (
                        <ToastBar toast={t}>
                            {({ icon, message }) => (
                                <>
                                    {icon}
                                    {message}
                                    {t.type !== 'loading' && <button onClick={() => toast.remove(t.id)}>X</button>}
                                </>
                            )}
                        </ToastBar>
                    )}
                </Toaster>
                <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
                <FaucetModal isOpen={faucetModalOpen} onClose={() => setFaucetModalOpen(false)} />
            </CaptchaContextManager.Provider>
        </CustomContext.Provider>
    )
}

export const ProsopoConsumer: FC<ConsumerProps> = ({ children }) => {
    return (
        <CaptchaContextManager.Consumer>
            {() => <CustomContext.Consumer>{(options) => children(options)}</CustomContext.Consumer>}
        </CaptchaContextManager.Consumer>
    )
}
