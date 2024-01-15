'use client'

import { Box, Button, TextField } from '@mui/material'
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid'
import { at, get } from '@prosopo/util'
import { contractOverview } from '@/services/contract/contractOverview'
import { useGlobalState } from '@/contexts/GlobalContext'
import React, { useEffect } from 'react'

const calculateFlex = (length: number) => {
    if (length < 4) {
        return 1
    }
    const flex = 1 / (12 / length) + 10 / Math.log(length + 1)
    return flex
}

const ContractOverview = () => {
    const { currentAccount, network, contracts, setContracts } = useGlobalState()

    useEffect(() => {
        contractOverview(network, currentAccount, contracts).catch((error) => {
            console.error('An error occurred while fetching contract overview data', error)
        })
    }, [currentAccount, network])

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)

        contractOverview(network, currentAccount, contracts, data.get('contractAddress') as string)
            .catch((error) => {
                console.error('An error occurred while fetching contract overview data', error)
            })
            .then((contract) => {
                if (contract) setContracts([...contracts, contract])
            })
    }
    return (
        <Box>
            <h1>Add contract</h1>
            <form onSubmit={handleSubmit}>
                <TextField name="contractAddress" label="New Contract Address" variant="outlined" />
                <Button type="submit" variant="contained">
                    Add Contract
                </Button>
            </form>
            <hr />
            <h1>Contract Details</h1>
            {contracts.map((contract, contractIndex) => {
                const rows: GridRowsProp = contract.providers.map((provider, providerIndex) => {
                    return {
                        id: providerIndex,
                        ...provider,
                    }
                })
                let columns: GridColDef[] = []
                if (contract.providers.length) {
                    const firstProvider = at(contract.providers, 0)
                    columns = columns.concat(
                        Object.keys(firstProvider).map((key: string) => {
                            return {
                                field: key,
                                headerName: key,
                                flex: calculateFlex(get(firstProvider, key).toString().length),
                            }
                        })
                    )
                }

                return (
                    <Box component="div" key={contractIndex}>
                        <h2>{contract.contractAddress}</h2>
                        <DataGrid autoHeight rows={rows} columns={columns} />
                    </Box>
                )
            })}
        </Box>
    )
}

export default ContractOverview
