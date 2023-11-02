'use client'

import { AppBar, Box, Toolbar } from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import dynamic from 'next/dynamic'

const AccountPicker = dynamic(() => import('./AccountPicker'), {
    ssr: false,
})

const TopBar = () => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Box display="flex" flexGrow={1}>
                    <Link href="/">
                        <Image src="/prosopo-logo-white.png" height={50} width={200} alt="Prosopo Logo" />
                    </Link>
                </Box>
                <Box m={2}>
                    <AccountPicker />
                </Box>
            </Toolbar>
        </AppBar>
    )
}

export default TopBar
