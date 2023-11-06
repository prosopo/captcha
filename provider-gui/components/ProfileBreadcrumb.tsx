'use client'

import * as React from 'react'
import { emphasize, styled } from '@mui/material/styles'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Chip from '@mui/material/Chip'
import Link from 'next/link'

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
    <div role="presentation" onClick={handleClick}>
        <Breadcrumbs aria-label="breadcrumb">
            <Link href="./summary" passHref>
                <StyledBreadcrumb component="a" label="Profile Summary" />
            </Link>
            <Link href="./actions" passHref>
                <StyledBreadcrumb component="a" label="Profile Actions" />
            </Link>
            <Link href="./dataset" passHref>
                <StyledBreadcrumb component="a" label="Profile Dataset" />
            </Link>
            <Link href="./environment" passHref>
                <StyledBreadcrumb component="a" label="Profile Environment" />
            </Link>
        </Breadcrumbs>
    </div>
)

export default ProfileBreadcrumb
