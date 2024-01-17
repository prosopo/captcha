import { Box } from '@mui/system'
import { Button, Divider, TextField, Typography } from '@mui/material'

type ProviderManagementOptionsProps = {
    onBack: () => void // Prop for the callback function
}

// Management options for the provider with divided segments
export const ProviderManagementOptions: React.FC<ProviderManagementOptionsProps> = ({ onBack }) => (
    <Box>
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Provider Update
            </Typography>
            <TextField fullWidth label="URL" variant="outlined" sx={{ mb: 2 }} />
            <TextField fullWidth label="Fee" variant="outlined" sx={{ mb: 2 }} />
            <TextField fullWidth label="Payee" variant="outlined" sx={{ mb: 2 }} />
            <TextField fullWidth label="Value" variant="outlined" sx={{ mb: 2 }} />
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Set Provider Dataset
            </Typography>
            <Button variant="outlined" component="label">
                Upload File
                <input type="file" hidden />
            </Button>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Button fullWidth variant="contained" color="primary">
            Batch Commit
        </Button>

        <Divider sx={{ mb: 4 }} />

        <Button fullWidth variant="contained" color="error" sx={{ mb: 4 }}>
            Provider Deregister
        </Button>

        <Divider sx={{ mb: 4 }} />

        <Button fullWidth variant="outlined" color="primary" onClick={onBack} sx={{ mt: 4 }}>
            Back to Details
        </Button>
    </Box>
)
