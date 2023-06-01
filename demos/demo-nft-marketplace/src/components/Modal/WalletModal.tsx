import { PolkadotJsIcon, ReloadIcon, SubwalletIcon, TalismanIcon } from 'assets'
import { useRouter } from 'next/router'
import Button, { ButtonType } from 'components/Button'
import Modal, { ModalProps } from './Modal'
import React from 'react'

type Props = Omit<ModalProps, 'children' | 'description' | 'title'>

function openInNewTab(url: string) {
    window.open(url, '_blank')
}

function WalletModal({ ...modalProps }: Props) {
    const router = useRouter()

    return (
        <Modal
            {...modalProps}
            title="Setup wallet"
            description="Wallet extension or account not found. Install one of the following:"
        >
            <div className="flex flex-col space-y-2">
                <Button
                    fullWidth
                    title="Polkadot.js"
                    icon={PolkadotJsIcon}
                    type={ButtonType.Main}
                    onClick={() => openInNewTab('https://polkadot.js.org/extension/')}
                />
                <Button
                    fullWidth
                    title="Talisman"
                    icon={TalismanIcon}
                    type={ButtonType.Main}
                    onClick={() => openInNewTab('https://app.talisman.xyz')}
                />
                <Button
                    fullWidth
                    title="SubWallet"
                    icon={SubwalletIcon}
                    type={ButtonType.Main}
                    onClick={() => openInNewTab('https://subwallet.app/download.html')}
                />
            </div>
            <p className="my-4 text-sm font-semibold text-white">Then set it up and reload the page.</p>
            <Button
                fullWidth
                title="Reload"
                icon={ReloadIcon}
                type={ButtonType.Secondary}
                onClick={() => router.reload()}
            />
            <p className="mt-4 text-sm font-semibold text-white">
                NOTE: Using more than one extension may cause issues.
            </p>
        </Modal>
    )
}

export default WalletModal
