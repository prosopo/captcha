// environment.ts
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
    DATABASE_PORT: number
    SUBSTRATE_NODE_URL: string
    API_BASE_URL: string
    API_PORT: number
    PAIR_TYPE: string
    SS58_FORMAT: number
    PROVIDER_ADDRESS: string
    PROVIDER_MNEMONIC: string
    NODE_ENV: 'development' | 'production' | 'test'
    LOG_LEVEL: 'Debug' | 'Info' | 'Warn' | 'Error'
}
