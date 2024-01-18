import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material'
import { providerDeregister } from '@/services/api/api'
import { signedBlockNumberHeaders } from '@/services/provider/provider'
import { useGlobalState } from '@/contexts/GlobalContext'
import React, { useState } from 'react'

type DeregisterDialogProps = {
    isDeregisterDialogOpen: boolean
    handleCloseDeregisterDialog: () => void
    providerBaseUrl: string
}

export const DeregisterConfirmationDialog: React.FC<DeregisterDialogProps> = ({
    isDeregisterDialogOpen,
    handleCloseDeregisterDialog,
    providerBaseUrl,
}) => {
    const [isLoading, setIsLoading] = useState(false)
    const { currentAccount } = useGlobalState()

    const handleDeregister = async () => {
        if (!currentAccount) {
            alert('Please select an account.')
            return
        }

        setIsLoading(true)
        try {
            const signedHeaders = await signedBlockNumberHeaders(currentAccount)
            await providerDeregister(providerBaseUrl, signedHeaders)
        } catch (error) {
            console.error('Error deregistering provider:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const renderDialogContent = () => (
        <>
            <DialogTitle>Confirm Deregistration</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to deregister this provider? This is really annoying to set up again.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDeregisterDialog} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleDeregister} color="error">
                    Deregister
                </Button>
            </DialogActions>
        </>
    )

    return (
        <Dialog open={isDeregisterDialogOpen} onClose={handleCloseDeregisterDialog}>
            {isLoading ? <CircularProgress /> : renderDialogContent()}
        </Dialog>
    )
}
