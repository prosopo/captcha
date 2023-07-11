'use client'

import React, { useState, ChangeEvent, FormEvent } from 'react'
import { Container, TextField, Button, Grid } from '@mui/material'
import GenericForm from '@/components/content-edit-form'

interface EnvironmentVariables {
    [key: string]: string
}

const initialValues: EnvironmentVariables = {
    CAPTCHA_WASM_PATH: './src/contract/sources/captcha/fa333789d24f851482aa137fcc91037808d2aeea/captcha.wasm',
    CAPTCHA_ABI_PATH: './src/contract/sources/captcha/fa333789d24f851482aa137fcc91037808d2aeea/captcha.json',
    DAPP_WASM_PATH: './src/contract/sources/dapp/411053b7ec79cc77f5ec9f5eb18610b24daaaaf0/dapp.wasm',
    DAPP_ABI_PATH: './src/contract/sources/dapp/411053b7ec79cc77f5ec9f5eb18610b24daaaaf0/dapp.json',
    DAPP_CONTRACT_ADDRESS: '',
    PROTOCOL_CONTRACT_ADDRESS: '5DKSwSJhUdRRW6xtJFy3cok7SRwpd6Pn3bpMMXqLmeeG19UY',
    DATABASE_PASSWORD: 'root',
    DATABASE_USERNAME: 'root',
    DATABASE_NAME: 'prosopo',
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: '27017',
    SUBSTRATE_NODE_URL: 'ws://localhost:9944',
    API_BASE_URL: 'http://localhost:9229',
    API_PORT: '9229',
    PAIR_TYPE: 'sr25519',
    SS58_FORMAT: '42',
    PROVIDER_ADDRESS: '5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV',
    PROVIDER_MNEMONIC: 'puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant',
    NODE_ENV: 'development',
    LOG_LEVEL: 'Debug',
}

export default function EnvironmentVariablesForm() {
    const handleSubmit = (values: { [key: string]: string }) => {
        console.log(values)
        // ... Add your API call here
    }

    return <GenericForm initialValues={initialValues} onSubmit={handleSubmit} />
}
