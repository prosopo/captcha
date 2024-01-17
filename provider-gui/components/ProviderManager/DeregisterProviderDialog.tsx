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
import { useState } from 'react'

type DeregisterDialogProps = {
    isDeregisterDialogOpen: boolean
    handleCloseDeregisterDialog: () => void
    providerBaseUrl: string
}
// Confirmation Dialog for Deregistering the Provider
export const DeregisterConfirmationDialog: React.FC<DeregisterDialogProps> = ({
    isDeregisterDialogOpen,
    handleCloseDeregisterDialog,
    providerBaseUrl,
}) => {
    const [loading, setLoading] = useState<boolean>(false)

    const handleDeregister = async () => {
        setLoading(true)
        await providerDeregister(providerBaseUrl)
        setLoading(false)
    }

    return (
        <Dialog open={isDeregisterDialogOpen} onClose={handleCloseDeregisterDialog}>
            {loading ? (
                <CircularProgress />
            ) : (
                <>
                    <DialogTitle>Confirm Deregistration</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to deregister this provider? This is really annoying to set up again.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleDeregister} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={handleCloseDeregisterDialog} color="error">
                            Deregister
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    )
}
