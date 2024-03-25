// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
