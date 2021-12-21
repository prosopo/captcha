export interface ProsopoConfig {
    defaultEnvironment: string
    networks: {
        development: {
            endpoint: string,
            contract: {
                address: string,
                deployer: { address: string }
            }
        }
    },
    database: {
        development: {
            type: string,
            endpoint: string
            dbname: string
        }
    },


}

