import { Box, Button, Divider, FormControlLabel, Switch, TextField } from '@mui/material'
import { DeregisterConfirmationDialog } from './DeregisterProviderDialog'
import { ProviderUpdate } from './ProviderUpdate'
import { batchCommit, updateDataset } from '@/services/api/api'
import { signedBlockNumberHeaders } from '@/services/provider/provider'
import { useGlobalState } from '@/contexts/GlobalContext'
import React, { useState } from 'react'

type ProviderManagementOptionsProps = {
    onBack: () => void
    handleOpenDeregisterDialog: () => void
    handleCloseDeregisterDialog: () => void
    isDeregisterDialogOpen: boolean
    providerBaseUrl: string
}

export const ProviderManagementOptions: React.FC<ProviderManagementOptionsProps> = ({
    onBack,
    handleOpenDeregisterDialog,
    handleCloseDeregisterDialog,
    isDeregisterDialogOpen,
    providerBaseUrl,
}) => {
    const { currentAccount } = useGlobalState()
    const [isJson, setIsJson] = useState(false)
    const [datasetInput, setDatasetInput] = useState('')

    const toggleJsonInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsJson(event.target.checked)
    }

    const updateDatasetInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDatasetInput(event.target.value)
    }

    const submitDataset = async () => {
        if (!currentAccount) {
            alert('Please select an account.')
            return
        }
        if (!datasetInput) {
            alert('Please enter a dataset.')
            return
        }
        try {
            const signedHeaders = await signedBlockNumberHeaders(currentAccount)
            const updatedDataset = await updateDataset(providerBaseUrl, signedHeaders, JSON.parse(datasetInput))
            console.log('Dataset updated:', updatedDataset)
        } catch (error) {
            console.error('Invalid JSON input:', error)
        }
    }

    const batchCommitHandler = async () => {
        if (!currentAccount) {
            alert('Please select an account.')
            return
        }
        try {
            const signedHeaders = await signedBlockNumberHeaders(currentAccount)
            const batchedCommitResponse = await batchCommit(providerBaseUrl, signedHeaders)
            console.log('Batch commit response:', batchedCommitResponse)
        } catch (error) {
            console.error('Error in batch commit:', error)
        }
    }

    return (
        <Box>
            {currentAccount ? (
                <>
                    <ProviderUpdate currentAccount={currentAccount} providerBaseUrl={providerBaseUrl} />
                    <Divider sx={{ mb: 4 }} />
                    <Button fullWidth variant="contained" color="primary" onClick={batchCommitHandler}>
                        Batch Commit
                    </Button>
                    <Divider sx={{ mb: 4 }} />

                    <Box sx={{ mb: 4 }}>
                        <FormControlLabel
                            control={<Switch checked={isJson} onChange={toggleJsonInput} />}
                            label="Input as JSON or text"
                        />
                        <TextField
                            fullWidth
                            label={isJson ? 'JSON Input' : 'Cleartext Input'}
                            multiline
                            rows={4}
                            value={datasetInput}
                            onChange={updateDatasetInput}
                            variant="outlined"
                            sx={{ mb: 2 }}
                        />
                        <Button fullWidth variant="contained" color="primary" onClick={submitDataset}>
                            Set Provider Dataset
                        </Button>
                    </Box>

                    <Button
                        fullWidth
                        variant="contained"
                        color="error"
                        sx={{ mb: 4 }}
                        onClick={handleOpenDeregisterDialog}
                    >
                        Provider Deregister
                    </Button>
                    <Divider />
                    <Button fullWidth variant="outlined" color="primary" onClick={onBack} sx={{ mt: 4 }}>
                        Back to Details
                    </Button>
                </>
            ) : (
                <>How have you got here without selecting an account??</>
            )}

            <DeregisterConfirmationDialog
                handleCloseDeregisterDialog={handleCloseDeregisterDialog}
                isDeregisterDialogOpen={isDeregisterDialogOpen}
                providerBaseUrl={providerBaseUrl}
            />
        </Box>
    )
}
