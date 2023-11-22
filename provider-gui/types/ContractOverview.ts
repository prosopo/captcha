export interface ContractOverview {
    contractAddress: string
    network: 'development' | 'rococo'
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
