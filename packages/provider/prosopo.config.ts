import { ProsopoConfig } from './src/types/config'
//import { Payee } from './src/types/api'

//TODO create types folder and make a types file per category of types
export default {
    defaultEnvironment: "development",
    networks: {
        development: {
            endpoint: "ws://127.0.0.1:9944",
            contract: {
                address: process.env.CONTRACT_ADDRESS,
                deployer: process.env.DEPLOYER_ADDRESS,
            },
        },
    },
    database : {
        development: {
            endpoint: "127.0.0.1:27017",
            dbname: "prosopo"
        }
    },
    provider: {
        address : "",
        mnemonic: process.env.PROVIDER_MNEMONIC,
        files: {
            secrets: { path:  "../secrets.json", },
            jsonseed: { path: "../provider.json" }
        },
        serviceOrigin: "",
        fee: 1,
        payee: "Provider"
    }
} as ProsopoConfig;