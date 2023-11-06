export interface ContractOverview {
    contractAddress: string
    network: 'development' | 'rococo'
    gitCommitId: string
    providers: {
        status: string
        balance: number
        fee: string
        payee: string
        url: string
        datasetId: string
        datasetIdContent: string
        isOnline: boolean
    }[]
}
