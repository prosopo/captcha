import { useState } from 'react'
import { Box, Button, Typography, FormControl, FormGroup, Stack, TextField, Alert } from '@mui/material'

import { TCaptchaSubmitResult, TExtensionAccount } from '@prosopo/procaptcha'

import {
    CaptchaComponent,
    CaptchaContextManager,
    ExtensionAccountSelect,
    useCaptcha,
    Procaptcha
} from "@prosopo/procaptcha-react";

import config from './config'

import './App.css'
import { VerificationResponse } from '@prosopo/api'

function App() {
    const [showCaptchas, setShowCaptchas] = useState(false)
    const [email, setEmail] = useState<string>('')
    const [name, setName] = useState<string>('')
    const [password, setPassword] = useState('')
    const [account, setAccount] = useState<TExtensionAccount | null>(null)

    const [isError, setIsError] = useState(false)
    const [message, setMessage] = useState('')
    const [isLogin, setIsLogin] = useState(true)

    const onAccountChange = (account: TExtensionAccount) => {
        // if (account) {
        //     //setShowCaptchas(true);
        //     console.log({ info: 'Selected account: ' + account?.meta.name })
        //     setAccount(account)
        //     console.log('CAPTCHA API', clientInterface.captchaApi)
        // }
    }

    const onSubmit = (submitResult: TCaptchaSubmitResult | Error) => {
        if (submitResult instanceof Error) {
            console.log({ error: ['onSubmit: CAPTCHA SUBMIT ERROR', submitResult] })
            return
        }
        const [result, tx] = submitResult
        console.log({ info: ['onSubmit: CAPTCHA SUBMIT STATUS', result.status] })
    }

    const onLoggedIn = (token) => {
        console.log('getting private resource with token ', token)
        fetch(`${config.serverUrl}/private`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        })
            .then(async (res) => {
                try {
                    const jsonRes = await res.json()
                    if (res.status === 200) {
                        setMessage(jsonRes.message)
                    }
                } catch (err) {
                    console.log(err)
                }
            })
            .catch((err) => {
                console.log(err)
            })
    }

    const onSubmitHandler = () => {
        //TODO make this always load CAPTCHA challenges, even if the user has already completed one
        setShowCaptchas(true)
    }

    const onChangeHandler = () => {
        setIsLogin(!isLogin)
        setMessage('')
    }

    const onHuman = async (onSolvedData) => {
        setShowCaptchas(false)
        const payload = {
            email,
            name,
            password,
            prosopo: onSolvedData,
        }
        fetch(`${config.serverUrl}/${isLogin ? 'login' : 'signup'}`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then(async (res) => {
                try {
                    const jsonRes = await res.json()
                    if (res.status !== 200) {
                        setIsError(true)
                        setMessage(jsonRes.message)
                    } else {
                        if (isLogin) {
                            onLoggedIn(jsonRes.token)
                        }
                        setIsError(false)
                        setMessage(jsonRes.message)
                    }
                } catch (err) {
                    console.log(err)
                }
            })
            .catch((err) => {
                console.log(err)
            })
    }

    const onChange = (solution: string[][]) => {
        console.log('onChange:', solution)
    }

    const onCancel = () => {
        setShowCaptchas(false)
        console.log({ info: '' })
    }

    // const clientInterface = useCaptcha({ config }, { onAccountChange, onChange, onSubmit, onHuman, onCancel })

    const disconnectAccount = () => {
        // clientInterface.onAccountUnset()
        console.log({ info: '' })
    }

    const getMessage = () => {
        if (isError) {
            return <Alert severity="error">{message}</Alert>
        } else {
            return <Alert severity="success">{message}</Alert>
        }
    }

    // const manager = clientInterface.manager;

    const onError = (error: Error) => {
        console.error(error)
        alert(error.message)
    }

    const onAccountNotFound = (address: string) => {
        alert(`Account ${address} not found`)
    }

    const conf = {
        userAccountAddress: '5EXaAvaSP1T4BMeHdtF2AudXq7ooRo6jHwi6HywenfSkedNa',
        web2: false,
        dappName: 'Prosopo',
        dappUrl: 'https://localhost:3001',
        network: {
            endpoint: process.env.REACT_APP_SUBSTRATE_ENDPOINT,
            prosopoContract: {
                address: process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS,
                name: 'prosopo',
            },
            dappContract: {
                address: process.env.REACT_APP_DAPP_CONTRACT_ADDRESS,
                name: 'dapp',
            },
        },
        solutionThreshold: 1,
    }

    return (
        <div>
            <Box className={"App"} sx={{ display: "flex"}}>
                <Box>
                    {/* {message ? getMessage() : null}
                    {clientInterface.extension && !manager.state.account && showCaptchas && clientInterface.extension.getAccounts() &&
                    <ExtensionAccountSelect
                        value={manager.state.account}
                        options={clientInterface.extension.getAccounts()}
                        onChange={clientInterface.onAccountChange.bind(clientInterface)}
                    />} */}
                    <Box>
                        <h1>{isLogin ? 'Login' : 'Signup'}</h1>
                        <FormGroup sx={{'& .MuiTextField-root': { m: 1 }}}>
                            <FormControl>
                                <TextField
                                    id="email"
                                    label="Email"
                                    type="text"
                                    autoComplete="Email"
                                    autoCapitalize="none"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </FormControl>

                            {!isLogin && (
                                <FormControl>
                                    <TextField
                                        id="name"
                                        label="Name"
                                        type="text"
                                        autoComplete="Name"
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </FormControl>
                            )}

                            <FormControl>
                                <TextField
                                    id="password"
                                    label="Password"
                                    type="password"
                                    autoComplete="Password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </FormControl>

                            <Procaptcha config={conf} callbacks={{onAccountNotFound, onError}}/>

                            <div>
                                <Stack direction="column" spacing={1} sx={{ '& button': { m: 1 } }}>
                                    <Button variant="contained" onClick={onSubmitHandler}>
                                        <Typography>Done</Typography>
                                    </Button>

                                    <Button variant="text" onClick={onChangeHandler}>
                                        <Typography>{isLogin ? 'Sign Up' : 'Log In'}</Typography>
                                    </Button>
                                </Stack>
                            </div>
                        </FormGroup>
                    </Box>

                </Box>
            </Box>
        </div>
    )
}

export default App
