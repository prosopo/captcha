export interface GuiContract {
    contractAddress: string
    network: 'development' | 'rococo' | 'shiden'
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
