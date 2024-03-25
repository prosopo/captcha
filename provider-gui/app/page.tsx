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

import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Tooltip from '@mui/material/Tooltip'
import { useRouter } from 'next/navigation'
import type React from 'react'

const App: React.FC = () => {
    const router = useRouter()

    const handleContractOverviewClick = () => {
        router.push('/contract-overview')
    }

    return (
        <Container style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20 }}>
            <Tooltip title='This feature is under development'>
                <span>
                    <Button variant='contained' size='large' disabled style={{ marginBottom: 20 }}>
                        Interact with a Provider
                    </Button>
                </span>
            </Tooltip>

            <Button variant='contained' size='large' color='primary' onClick={handleContractOverviewClick}>
                Contract Overview
            </Button>
        </Container>
    )
}

export default App
