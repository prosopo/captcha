export interface Environment {
    CAPTCHA_WASM_PATH: string
    CAPTCHA_ABI_PATH: string
    DAPP_WASM_PATH: string
    DAPP_ABI_PATH: string
    DAPP_CONTRACT_ADDRESS: string
    PROTOCOL_CONTRACT_ADDRESS: string
    DATABASE_PASSWORD: string
    DATABASE_USERNAME: string
    DATABASE_NAME: string
    DATABASE_HOST: string
    DATABASE_PORT: string
    SUBSTRATE_NODE_URL: string
    API_BASE_URL: string
    API_PORT: string
    PAIR_TYPE: string
    SS58_FORMAT: string
    PROVIDER_ADDRESS: string
    PROVIDER_MNEMONIC: string
    NODE_ENV: string
    LOG_LEVEL: string
}

export interface Actions {
    currentStake: number
    isActive: boolean
    isRegistered: boolean
}

export interface Dataset {
    datasetContentId: string
    datasetId: string
}

export interface Summary {
    balance: number
    payee: string
    status: string
    url: string
    fee: number
}
