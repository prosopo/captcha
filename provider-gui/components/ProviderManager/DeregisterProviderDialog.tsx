import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'

type DeregisterDialogProps = {
    isDeregisterDialogOpen: boolean
    handleCloseDeregisterDialog: () => void
}
// Confirmation Dialog for Deregistering the Provider
export const DeregisterConfirmationDialog: React.FC<DeregisterDialogProps> = ({
    isDeregisterDialogOpen,
    handleCloseDeregisterDialog,
}) => (
    <Dialog open={isDeregisterDialogOpen} onClose={handleCloseDeregisterDialog}>
        <DialogTitle>Confirm Deregistration</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Are you sure you want to deregister this provider? This action cannot be undone.
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseDeregisterDialog} color="primary">
                Cancel
            </Button>
            <Button onClick={handleCloseDeregisterDialog} color="error">
                Deregister
            </Button>
        </DialogActions>
    </Dialog>
)
