export interface ProsopoConfig {
    defaultEnvironment: string
    networks: {
        development: {
            endpoint: string,
            contract: {
                address: string,
                deployer: string
            }
        }
    },
    database: {
        development: {
            endpoint: string
            dbname: string
        }

    },
    provider?: {
        address: string,
        secret_file: string,
        seed?: string
        service_origin: string,
        fee: number,
        payee: string
    }
    dapp?: {
        contract: string,
        secret_file: string,
        seed?: string
        client_origin: string,
        owner: string
        fee: number,
        payee: string
    }

}

