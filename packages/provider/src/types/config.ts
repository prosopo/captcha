export interface ProsopoConfig {
    defaultEnvironment: string
    networks: {
        development: {
            endpoint: string,
            contract: {
                address: string,
                deployer: string
            }
            secrets: string

        }
    },
    database: {
        development: {
            endpoint: string
            dbname: string
        }

    }
}



