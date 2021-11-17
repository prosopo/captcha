export interface ProsopoConfig {
    defaultEnvironment: string
    networks: {
        development: {
            endpoint: string,
            contract: {
                address: string,
                deployer: { address: string }
            }
            provider?: {
                address: string,
                mnemonic: string,
                serviceOrigin: string,
                fee: number,
                payee: string
            }
            dapp?: {
                contract: string,
                mnemonic: string,
                client_origin: string,
                owner: string
                fee: number,
                payee: string
            }
        }
    },
    database: {
        development: {
            endpoint: string
            dbname: string
        }
    },


}

export interface MnemonicFile {
    mnemonic: string
}

export interface PasswordFile {
    password: string
}

