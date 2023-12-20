'use client'

import { useRouter } from 'next/navigation'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import React from 'react'
import Tooltip from '@mui/material/Tooltip'

const App: React.FC = () => {
    const router = useRouter()

    const handleContractOverviewClick = () => {
        router.push('/contract-overview')
    }

    return (
        <Container style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20 }}>
            <Tooltip title="This feature is under development">
                <span>
                    <Button variant="contained" size="large" disabled style={{ marginBottom: 20 }}>
                        Interact with a Provider
                    </Button>
                </span>
            </Tooltip>

            <Button variant="contained" size="large" color="primary" onClick={handleContractOverviewClick}>
                Contract Overview
            </Button>
        </Container>
    )
}

export default App
