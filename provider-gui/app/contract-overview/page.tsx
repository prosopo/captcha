import React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

const ContractOverview = () => {
    const contractsData = [
        {
            contractAddress: '0x123...',
            network: 'Ethereum',
            gitCommitId: 'a1b2c3d',
            providers: [
                {
                    status: 'Inactive',
                    balance: 0,
                    fee: 0,
                    payee: 'Dapp',
                    url: '0x0000000000000000000000000000000038322e31332e37302e33313a39323239',
                    datasetId: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    datasetIdContent: '0x0000000000000000000000000000000000000000000000000000000000000000',
                },
                {
                    status: 'Inactive',
                    balance: 0,
                    fee: 0,
                    payee: 'Dapp',
                    url: '0x00000000000000000000000000000038322e34352e32352e3131393a39323239',
                    datasetId: '0x74bb679899da530e3af7734c0545c763452ffdc786334b36fa49ba2709a1eb88',
                    datasetIdContent: '0x713312f70060e13abe8adc6904787f4264e81f224e300b2fc7e707538e7a3095',
                },
                {
                    status: 'Inactive',
                    balance: 0,
                    fee: 0,
                    payee: 'Provider',
                    url: 'http://localhost:9229',
                    datasetId: '0x74bb679899da530e3af7734c0545c763452ffdc786334b36fa49ba2709a1eb88',
                    datasetIdContent: '0x713312f70060e13abe8adc6904787f4264e81f224e300b2fc7e707538e7a3095',
                },
            ],
        },
        {
            contractAddress: '0x123...',
            network: 'Ethereum',
            gitCommitId: 'a1b2c3d',
            providers: [
                {
                    status: 'Inactive',
                    balance: 0,
                    fee: 0,
                    payee: 'Dapp',
                    url: '0x0000000000000000000000000000000038322e31332e37302e33313a39323239',
                    datasetId: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    datasetIdContent: '0x0000000000000000000000000000000000000000000000000000000000000000',
                },
                {
                    status: 'Inactive',
                    balance: 0,
                    fee: 0,
                    payee: 'Dapp',
                    url: '0x00000000000000000000000000000038322e34352e32352e3131393a39323239',
                    datasetId: '0x74bb679899da530e3af7734c0545c763452ffdc786334b36fa49ba2709a1eb88',
                    datasetIdContent: '0x713312f70060e13abe8adc6904787f4264e81f224e300b2fc7e707538e7a3095',
                },
                {
                    status: 'Inactive',
                    balance: 0,
                    fee: 0,
                    payee: 'Provider',
                    url: 'http://localhost:9229',
                    datasetId: '0x74bb679899da530e3af7734c0545c763452ffdc786334b36fa49ba2709a1eb88',
                    datasetIdContent: '0x713312f70060e13abe8adc6904787f4264e81f224e300b2fc7e707538e7a3095',
                },
            ],
        },
    ]

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
