'use client'

import { AppBar, Box, Toolbar, Typography } from '@mui/material'
import { useGlobalState } from '../contexts/GlobalContext'
import AccountPicker from './account-picker'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const TopBar = () => {
    const { providerDetails } = useGlobalState()

    return (
        <AppBar position="static">
            <Toolbar>
                <Box display="flex" flexGrow={1}>
                    <Link href="/">
                        <Image src="/../public/prosopo-logo-white.png" height={50} width={200} alt="Prosopo Logo" />
                    </Link>
                </Box>
                <AccountPicker />
                <Typography variant="body1">
                    Provider URL: {providerDetails.profile.summary?.url ?? 'Not Selected'}
                </Typography>
                <Box mx={2} />
                <Typography variant="body1">Account: {providerDetails.currentAccount ?? 'Not Selected'}</Typography>
            </Toolbar>
        </AppBar>
    )
}

export default TopBar
