'use client'

import { contractOverview } from '@/services/contract/contractOverview'
import Paper from '@mui/material/Paper'
import React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

const ContractOverview = async () => {
    const contractsData = await contractOverview('rococo', '5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV')

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
