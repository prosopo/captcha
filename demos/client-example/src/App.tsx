import { useState } from 'react'
import { Box, Button, Typography, FormControl, FormGroup, Stack, TextField, Alert } from '@mui/material'

import { ProcaptchaOutput } from '@prosopo/procaptcha'

import { Procaptcha, ExtensionAccountSelect } from '@prosopo/procaptcha-react'

import './App.css'

function App() {
    const [email, setEmail] = useState<string>('')
    const [name, setName] = useState<string>('')
    const [password, setPassword] = useState('')
    const [account, setAccount] = useState<string>('')

    const [isError, setIsError] = useState(false)
    const [message, setMessage] = useState('')
    // whether the form is doing a login or a signup action
    const [isLogin, setIsLogin] = useState(true)
    // the result of the captcha process. Submit this to your backend server to verify the user is human on the backend
    const [procaptchaOutput, setProcaptchaOutput] = useState<ProcaptchaOutput | undefined>(undefined)

    const serverUrl = process.env.REACT_APP_SERVER_URL || ''

    const label = isLogin ? 'Login' : 'Sign up'
    const urlPath = isLogin ? 'login' : 'signup'

    const onLoggedIn = (token) => {
        console.log('getting private resource with token ', token)
        fetch(`${serverUrl}/private`, {
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

    const onActionHandler = () => {
        if (!procaptchaOutput) {
            alert('Must complete captcha')
        }
        const payload = {
            email,
            name,
            password,
            prosopo: procaptchaOutput,
        }
        fetch(`${serverUrl}/${urlPath}`, {
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

    const onChangeHandler = () => {
        setIsLogin(!isLogin)
        setMessage('')
    }

    const onHuman = async (procaptchaOutput: ProcaptchaOutput) => {
        console.log('onHuman', procaptchaOutput)
        setProcaptchaOutput(procaptchaOutput)
    }

    const getMessage = () => {
        if (isError) {
            return <Alert severity="error">{message}</Alert>
        } else {
            return <Alert severity="success">{message}</Alert>
        }
    }

    const onError = (error: Error) => {
        alert(error.message)
    }

    const onAccountNotFound = (address: string) => {
        alert(`Account ${address} not found`)
    }

    const onExpired = () => {
        alert('Challenge has expired')
    }

    const config = {
        userAccountAddress: account,
        web2: process.env.REACT_APP_WEB2 === 'true',
        dappName: 'Prosopo',
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
        solutionThreshold: 80,
    }

    return (
        <div>
            <Box className={'App'} sx={{ display: 'flex' }}>
                <Box>
                    <Typography>{message ? getMessage() : null}</Typography>
                    {!config.web2 ? (
                        <ExtensionAccountSelect dappName={config.dappName} value={account} onChange={setAccount} />
                    ) : (
                        <></>
                    )}
                    <Box>
                        <h1>{label}</h1>
                        <FormGroup sx={{ '& .MuiTextField-root': { m: 1 } }}>
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

                            <Procaptcha
                                config={config}
                                callbacks={{ onAccountNotFound, onError, onHuman, onExpired }}
                            />

                            <div>
                                <Stack direction="column" spacing={1} sx={{ '& button': { m: 1 } }}>
                                    <Button variant="contained" onClick={onActionHandler} disabled={!procaptchaOutput}>
                                        {isLogin ? 'Login' : 'Sign up'}
                                    </Button>
                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                        <Box>
                                            <Typography>- or -</Typography>
                                        </Box>
                                    </Box>
                                    <Button onClick={onChangeHandler}>{isLogin ? 'Signup' : 'Login'}</Button>
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
