'use client'

import { Box, Button, Chip, CircularProgress, Grid, TextField } from '@mui/material'
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid'
import { GuiContract } from '@/types/ContractOverview'
import { at, get } from '@prosopo/util'
import { contractOverview } from '@/services/contract/contractOverview'
import { useGlobalState } from '@/contexts/GlobalContext'
import { useState } from 'react'
import React, { useEffect } from 'react'

const calculateFlex = (length: number) => {
    if (length < 4) {
        return 1
    }
    const flex = 1 / (12 / length) + 10 / Math.log(length + 1)
    return flex
}

const ContractOverview = () => {
    const [loading, setLoading] = useState<boolean>(false)
    const [newContractAddr, setNewContractAddr] = useState<string>('')
    const { currentAccount, network, contracts, setContracts } = useGlobalState()

    useEffect(() => {
        // Check if currentAccount (and any other dependencies) is loaded
        if (!currentAccount || !network) {
            console.log('Waiting for currentAccount and network to be loaded')
            return
        }

        setLoading(true)
        contractOverview(network, currentAccount, contracts)
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
        console.log(event.target.value)
        setNewContractAddr(event.target.value)
    }

    const handleSubmit = () => {
        setLoading(true)
        contractOverview(network, currentAccount, contracts, newContractAddr)
            .catch((error) => {
                console.error('An error occurred while fetching contract overview data', error)
            })
            .then((contract) => {
                if (contract) setContracts([...contracts, contract])
                console.log(contract)
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
        </Box>
    )
}

export default ContractOverview
