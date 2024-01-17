import { Box } from '@mui/system'
import { Button, Divider, List, ListItem, Modal, Paper, Typography } from '@mui/material'
import { ProviderManagementOptions } from './ProviderManagementOptions'
import { ProviderSummary } from '@/types/ProviderProfileTypes'
import { useState } from 'react'
import React from 'react'

type ProviderManagementProps = {
    isModalOpen: boolean
    handleCloseModal: () => void
    selectedRow: ProviderSummary | null
    handleOpenDeregisterDialog: () => void
    handleCloseDeregisterDialog: () => void
    isDeregisterDialogOpen: boolean
}

export const RowDataModal: React.FC<ProviderManagementProps> = ({
    isModalOpen,
    handleCloseModal,
    selectedRow,
    handleOpenDeregisterDialog,
    handleCloseDeregisterDialog,
    isDeregisterDialogOpen,
}) => {
    const [isManageProvider, setIsManageProvider] = useState(false)

    const handleManageProviderClick = () => {
        setIsManageProvider(!isManageProvider)
    }

    const handleBackToDetails = () => {
        setIsManageProvider(false)
    }

    const closeModal = () => {
        handleCloseModal()
        handleBackToDetails()
    }

    return (
        <Modal open={isModalOpen} onClose={closeModal}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'auto',
                    maxWidth: '80%',
                    bgcolor: 'white',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                    overflow: 'auto',
                }}
            >
                <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                    {isManageProvider ? 'Manage Provider' : 'Edit Row Data'}
                </Typography>
                {isManageProvider ? (
                    <ProviderManagementOptions
                        onBack={handleBackToDetails}
                        handleOpenDeregisterDialog={handleOpenDeregisterDialog}
                        handleCloseDeregisterDialog={handleCloseDeregisterDialog}
                        isDeregisterDialogOpen={isDeregisterDialogOpen}
                        providerBaseUrl={selectedRow?.url || ''}
                    />
                ) : (
                    <Box>
                        <Paper elevation={3} sx={{ mb: 3 }}>
                            <List>
                                {selectedRow &&
                                    Object.entries(selectedRow).map(([key, value], index) => (
                                        <React.Fragment key={key}>
                                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="subtitle1" component="span">
                                                    {key}:
                                                </Typography>
                                                <Typography variant="body2" component="span">
                                                    {value.toString()}
                                                </Typography>
                                            </ListItem>
                                            {index < Object.entries(selectedRow).length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                            </List>
                        </Paper>
                        <Button variant="contained" onClick={handleManageProviderClick}>
                            Manage Provider
                        </Button>
                    </Box>
                )}
            </Box>
        </Modal>
    )
}
