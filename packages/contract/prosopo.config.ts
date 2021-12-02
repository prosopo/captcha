import {ProsopoConfig} from './src/types'

//TODO create types folder and make a types file per category of types
export default {
    defaultEnvironment: "development",
    networks: {
        development: {
            endpoint: "ws://127.0.0.1:9944",
            contract: {
                address: process.env.CONTRACT_ADDRESS,
                deployer: {
                    address: process.env.DEPLOYER_ADDRESS
                }
            },
            provider: {
                address: process.env.PROVIDER_ADDRESS,
                mnemonic: process.env.PROVIDER_MNEMONIC,
                serviceOrigin: "",
                fee: 1,
                payee: "Provider"
            }

        },
    },
    database: {
        development: {
            type: "mongo",
            endpoint: "mongodb://127.0.0.1:27017",
            dbname: "prosopo"
        }
    },

} as ProsopoConfig;