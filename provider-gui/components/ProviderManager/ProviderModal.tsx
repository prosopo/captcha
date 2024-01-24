import { Box, Button, Divider, List, ListItem, Modal, Paper, Typography } from '@mui/material'
import { ProviderManagementOptions } from './ProviderManagementOptions'
import { ProviderSummary } from '@/types/ProviderProfileTypes'
import React, { useState } from 'react'

type ProviderManagementProps = {
    isModalOpen: boolean
    handleCloseModal: () => void
    selectedRow: ProviderSummary | null
    handleOpenDeregisterDialog: () => void
    handleCloseDeregisterDialog: () => void
    isDeregisterDialogOpen: boolean
}

const RowDataModal: React.FC<ProviderManagementProps> = ({
    isModalOpen,
    handleCloseModal,
    selectedRow,
    handleOpenDeregisterDialog,
    handleCloseDeregisterDialog,
    isDeregisterDialogOpen,
}) => {
    const [isManageProvider, setIsManageProvider] = useState(false)

    const toggleManageProvider = () => setIsManageProvider((prev) => !prev)
    const closeModalAndReset = () => {
        handleCloseModal()
        setIsManageProvider(false)
    }

    const renderRowDetails = () => (
        <Paper elevation={3} sx={{ mb: 3 }}>
            <List>
                {selectedRow &&
                    Object.entries(selectedRow).map(([key, value], index) => (
                        <React.Fragment key={key}>
                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle1">{key}:</Typography>
                                <Typography variant="body2">{value.toString()}</Typography>
                            </ListItem>
                            {index < Object.entries(selectedRow).length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
            </List>
        </Paper>
    )

    return (
        <Modal open={isModalOpen} onClose={closeModalAndReset}>
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
                        onBack={() => setIsManageProvider(false)}
                        handleOpenDeregisterDialog={handleOpenDeregisterDialog}
                        handleCloseDeregisterDialog={handleCloseDeregisterDialog}
                        isDeregisterDialogOpen={isDeregisterDialogOpen}
                        providerBaseUrl={selectedRow?.url || ''}
                    />
                ) : (
                    <Box>
                        {renderRowDetails()}
                        <Button variant="contained" onClick={toggleManageProvider}>
                            Manage Provider
                        </Button>
                    </Box>
                )}
            </Box>
        </Modal>
    )
}

export default RowDataModal
