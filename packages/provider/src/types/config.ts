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
        mnemonic: string,
        files: {
            secrets: { path: string, json?: PasswordFile },
            jsonseed: { path: string, json?: MnemonicFile }
        }
        serviceOrigin: string,
        fee: number,
        payee: string
    }
    dapp?: {
        contract: string,
        mnemonic: string,
        files: {
            secrets: { path: string, json?: PasswordFile },
            jsonseed: { path: string, json?: MnemonicFile }
        }
        client_origin: string,
        owner: string
        fee: number,
        payee: string
    }

}

export interface MnemonicFile {
    mnemonic: string
}

export interface PasswordFile {
    password: string
}

