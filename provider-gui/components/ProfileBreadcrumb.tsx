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

import Breadcrumbs from '@mui/material/Breadcrumbs'
import Chip from '@mui/material/Chip'
import { emphasize, styled } from '@mui/material/styles'
import Link from 'next/link'
import type * as React from 'react'

const StyledBreadcrumb = styled(Chip)(({ theme }) => {
    const backgroundColor = theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800]
    return {
        backgroundColor,
        height: theme.spacing(3),
        color: theme.palette.text.primary,
        fontWeight: theme.typography.fontWeightRegular,
        '&:hover, &:focus': {
            backgroundColor: emphasize(backgroundColor, 0.06),
        },
        '&:active': {
            boxShadow: theme.shadows[1],
            backgroundColor: emphasize(backgroundColor, 0.12),
        },
    }
}) as typeof Chip

const handleClick = (event: React.MouseEvent<Element, MouseEvent>) => {
    event.preventDefault()
    console.info('You clicked a breadcrumb.')
}

const ProfileBreadcrumb: React.FC = () => (
    <div role='presentation' onClick={handleClick}>
        <Breadcrumbs aria-label='breadcrumb'>
            <Link href='./summary' passHref>
                <StyledBreadcrumb component='a' label='Profile Summary' />
            </Link>
            <Link href='./actions' passHref>
                <StyledBreadcrumb component='a' label='Profile Actions' />
            </Link>
            <Link href='./dataset' passHref>
                <StyledBreadcrumb component='a' label='Profile Dataset' />
            </Link>
            <Link href='./environment' passHref>
                <StyledBreadcrumb component='a' label='Profile Environment' />
            </Link>
        </Breadcrumbs>
    </div>
)

export default ProfileBreadcrumb
