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

import { Box, Button, Chip, CircularProgress, Grid, TextField } from '@mui/material'
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid'
import { GuiContract } from '@/types/ContractOverview'
import { at, get } from '@prosopo/util'
import { contractOverview } from '@/services/contract/contractOverview'
import { useGlobalState } from '@/contexts/GlobalContext'
import { useState } from 'react'
import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'

const RowDataModal = dynamic(() => import('@/components/ProviderManager/ProviderModal'), {
    ssr: false,
})

const calculateFlex = (length: number) => {
    if (length < 4) {
        return 1
    }
    const flex = 1 / (12 / length) + 10 / Math.log(length + 1)
    return flex
}

const ContractOverview = () => {
    const { currentAccount: currentAccount, network, contracts, setContracts } = useGlobalState()
    const [loading, setLoading] = useState<boolean>(false)
    const [newContractAddr, setNewContractAddr] = useState<string>('')
    const [isDeregisterDialogOpen, setIsDeregisterDialogOpen] = useState(false)
    const [selectedRow, setSelectedRow] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Handle opening the modal with selected row data
    const handleEditClick = (row: any) => {
        setSelectedRow(row)
        setIsModalOpen(true)
    }

    // Handle closing the modal
    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedRow(null)
    }

    const handleCloseDeregisterDialog = () => {
        setIsDeregisterDialogOpen(false)
    }

    const handleOpenDeregisterDialog = () => {
        setIsDeregisterDialogOpen(true)
    }

    useEffect(() => {
        // Check if currentAccount (and any other dependencies) is loaded
        if (!currentAccount || !network) {
            console.log('Waiting for currentAccount and network to be loaded')
            return
        }

        setLoading(true)
        contractOverview(network, currentAccount.address, contracts)
            .catch((error) => {
                console.error('An error occurred while fetching contract overview data', error)
            })
            .then((contract) => {
                if (contract) setContracts([...contracts, contract])
            })
            .finally(() => {
                setLoading(false)
            })
    }, [currentAccount, network])

    function handleNewAddrChange(event: React.ChangeEvent<HTMLInputElement>) {
        setNewContractAddr(event.target.value)
    }

    const handleSubmit = () => {
        setLoading(true)

        if (!currentAccount) {
            console.log('No account selected')
            return
        }
        contractOverview(network, currentAccount.address, contracts, newContractAddr)
            .catch((error) => {
                console.error('An error occurred while fetching contract overview data', error)
            })
            .then((contract) => {
                if (contract) setContracts([...contracts, contract])
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const renderDataGrid = (contract: GuiContract, contractIndex: number) => {
        const rows: GridRowsProp = contract.providers.map((provider, providerIndex) => ({
            id: providerIndex,
            ...provider,
        }))

        let columns: GridColDef[] = []
        if (contract.providers.length) {
            const firstProvider = at(contract.providers, 0)
            columns = Object.keys(firstProvider).map((key: string) => ({
                field: key,
                headerName: key,
                flex: calculateFlex(get(firstProvider, key).toString().length),
            }))
            columns.push({
                field: 'actions',
                headerName: 'Actions',
                flex: 1,
                renderCell: (params) => (
                    <Button variant="contained" size="small" onClick={() => handleEditClick(params.row)}>
                        Edit
                    </Button>
                ),
            })
        }

        return (
            <Box component="div" key={contractIndex}>
                <h2>
                    {contract.contractAddress}
                    {contractIndex === 0 && <Chip label="Default Contract" sx={{ marginLeft: '2rem' }} />}
                </h2>
                <DataGrid autoHeight rows={rows} columns={columns} />
            </Box>
        )
    }

    return (
        <Box>
            <h1>Add contract</h1>
            <Grid container spacing={2}>
                <Grid item>
                    <TextField
                        name="contractAddress"
                        label="New Contract Address"
                        variant="outlined"
                        onChange={handleNewAddrChange}
                    />
                </Grid>
                <Grid item>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        onClick={handleSubmit}
                        size="large"
                        style={{ height: '100%' }}
                    >
                        {loading ? <CircularProgress size="24px" /> : 'Add Contract'}
                    </Button>
                </Grid>
            </Grid>
            <hr />
            <h1>Contract Details</h1>
            {contracts.map(renderDataGrid)}

            <RowDataModal
                handleCloseModal={handleCloseModal}
                isModalOpen={isModalOpen}
                selectedRow={selectedRow}
                handleOpenDeregisterDialog={handleOpenDeregisterDialog}
                handleCloseDeregisterDialog={handleCloseDeregisterDialog}
                isDeregisterDialogOpen={isDeregisterDialogOpen}
            />
        </Box>
    )
}

export default ContractOverview
