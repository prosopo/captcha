import { Box, Button, Divider, FormControlLabel, Switch, TextField } from '@mui/material'
import { DeregisterConfirmationDialog } from './DeregisterProviderDialog'
import { ProviderUpdate } from './ProviderUpdate'
import { signedBlockNumberHeaders } from '@/services/provider/provider'
import { updateDataset } from '@/services/api/api'
import { useGlobalState } from '@/contexts/GlobalContext'
import React, { useState } from 'react'

type ProviderManagementOptionsProps = {
    onBack: () => void // Prop for the callback function
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

    const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsJson(event.target.checked)
    }

    const handleDatasetInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDatasetInput(event.target.value)
    }

    const handleSubmitDataset = async () => {
        let dataset
        try {
            if (!currentAccount) {
                alert('Please select an account.')
                return
            }
            dataset = isJson ? JSON.parse(datasetInput) : { text: datasetInput }
            console.log('Dataset:', dataset)

            const signedHeaders = await signedBlockNumberHeaders(currentAccount)
            const updatedDataset = await updateDataset(providerBaseUrl, signedHeaders, dataset)

            return updatedDataset
        } catch (error) {
            console.error('Invalid JSON input:', error)
        }
    }

    return (
        <Box>
            {currentAccount ? (
                <>
                    <ProviderUpdate currentAccount={currentAccount} />
                    <Divider sx={{ mb: 4 }} />
                    <Button fullWidth variant="contained" color="primary">
                        Batch Commit
                    </Button>
                    <Divider sx={{ mb: 4 }} />
                    <Divider sx={{ mb: 4 }} />

                    <Box sx={{ mb: 4 }}>
                        <FormControlLabel
                            control={<Switch checked={isJson} onChange={handleToggleChange} />}
                            label="Input as JSON or text"
                        />
                        <TextField
                            fullWidth
                            label={isJson ? 'JSON Input' : 'Cleartext Input'}
                            multiline
                            rows={4}
                            value={datasetInput}
                            onChange={handleDatasetInputChange}
                            variant="outlined"
                            sx={{ mb: 2 }}
                        />
                        <Button fullWidth variant="contained" color="primary" onClick={handleSubmitDataset}>
                            Set Provider Dataset
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 4 }} />
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
