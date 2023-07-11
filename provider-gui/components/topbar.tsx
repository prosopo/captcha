'use client'

import { AppBar, Box, Toolbar, Typography } from '@mui/material'
import Image from 'next/image'
import React from 'react'

const TopBar = () => {
    const connectedEndpoint = 'ws://localhost:9944' // Replace with real data
    const connectedAccount = '5EjTA28bKSbKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV' // Replace with real data

    return (
        <AppBar position="static">
            <Toolbar>
                <Box display="flex" flexGrow={1}>
                    <Image src="../public/prosopo-logo-white.png" height={50} alt="Prosopo Logo" />
                </Box>
                <Typography variant="body1">Endpoint: {connectedEndpoint}</Typography>
                <Box mx={2} />
                <Typography variant="body1">Account: {connectedAccount}</Typography>
            </Toolbar>
        </AppBar>
    )
}

export default TopBar
