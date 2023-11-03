/* eslint-disable @next/next/no-async-client-component */
'use client'

import { Box } from '@mui/material'
import { ContractOverview } from '@/types/ContractOverview'
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid'
import { at, get } from '@prosopo/util'
import { contractOverview } from '@/services/contract/contractOverview'
import { useGlobalState } from '@/contexts/GlobalContext'
import React, { useEffect, useState } from 'react'

const calculateFlex = (length: number) => {
    if (length < 4) {
        return 1
    }
    const flex = 1 / (12 / length) + 10 / Math.log(length + 1)
    console.log('flex', flex)
    return flex
}

const ContractOverview = () => {
    const { currentAccount, network } = useGlobalState()
    const [contractsData, setContractsData] = useState<ContractOverview[]>([])

    useEffect(() => {
        const fetchData = () => {
            contractOverview(network, currentAccount)
                .then((data) => {
                    setContractsData(data)
                })
                .catch((error) => {
                    console.error('An error occurred while fetching contract overview data', error)
                })
        }

        fetchData()
    }, [currentAccount, network])
    return (
        <Box>
            <h1>Contract Details</h1>
            {contractsData.map((contract, contractIndex) => {
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
