// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
