/* eslint-disable @next/next/no-async-client-component */
'use client'

import { ContractOverview } from '@/types/contractOverview'
import { contractOverview } from '@/services/contract/contractOverview'
import { useGlobalState } from '@/contexts/GlobalContext'
import Paper from '@mui/material/Paper'
import React, { useEffect, useState } from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

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
        <TableContainer component={Paper}>
            <Table aria-label="Contract Overview">
                <TableHead>
                    <TableRow>
                        <TableCell>Contract Address</TableCell>
                        <TableCell align="right">Network</TableCell>
                        <TableCell align="right">Git Commit ID</TableCell>
                        <TableCell align="right">Providers</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {contractsData.map((contract, contractIndex) => (
                        <TableRow key={contractIndex}>
                            <TableCell component="th" scope="row">
                                {contract.contractAddress}
                            </TableCell>
                            <TableCell align="right">{contract.network}</TableCell>
                            <TableCell align="right">{contract.gitCommitId}</TableCell>
                            <TableCell align="right">
                                {contract.providers.map((provider, providerIndex) => (
                                    <div key={providerIndex}>
                                        <div>Status: {provider.status}</div>
                                        <div>Balance: {provider.balance}</div>
                                        <div>Fee: {provider.fee}</div>
                                        <div>Payee: {provider.payee}</div>
                                        <div>URL: {provider.url}</div>
                                        <div>Dataset ID: {provider.datasetId}</div>
                                        <div>Dataset ID Content: {provider.datasetIdContent}</div>
                                        <div>Server Online and Responsive?: {provider.isOnline ? 'true' : 'false'}</div>
                                        <br />
                                    </div>
                                ))}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

export default ContractOverview
