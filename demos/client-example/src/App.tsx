import {useState} from "react";
import {
    Box,
    Button,
    Typography,
    FormControl,
    FormGroup,
    Stack,
    TextField
} from "@mui/material";

import {
    TCaptchaSubmitResult,
    TExtensionAccount,
} from "@prosopo/procaptcha";

import {
    CaptchaComponent,
    CaptchaContextManager,
    ExtensionAccountSelect,
    useCaptcha,
    Procaptcha
} from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";

function App() {

    const [showCaptchas, setShowCaptchas] = useState(false);
    const [email, setEmail] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [password, setPassword] = useState('');
    const [account, setAccount] = useState<TExtensionAccount | null>(null);

    const [isError, setIsError] = useState(false);
    const [message, setMessage] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    const showCaptchaClick = () => {
        setShowCaptchas(true);
        status.update({info: ""});
    };

    const onAccountChange = (account: TExtensionAccount) => {
        if (account) {
            //setShowCaptchas(true);
            status.update({info: "Selected account: " + account?.meta.name});
            setAccount(account);
            console.log("CAPTCHA API", clientInterface.captchaApi);
        }
    };

    const onSubmit = (submitResult: TCaptchaSubmitResult | Error) => {
        if (submitResult instanceof Error) {
            status.update({error: ["onSubmit: CAPTCHA SUBMIT ERROR", submitResult]});
            return;
        }
        const [result, tx] = submitResult;
        status.update({info: ["onSubmit: CAPTCHA SUBMIT STATUS", result.status]});
    };

    const onLoggedIn = token => {
        fetch(`${manager.state.config.serverUrl}/private`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(async res => {
                try {
                    const jsonRes = await res.json();
                    if (res.status === 200) {
                        setMessage(jsonRes.message);
                    }
                } catch (err) {
                    console.log(err);
                }
                ;
            })
            .catch(err => {
                console.log(err);
            });
    }

    const onSubmitHandler = () => {
        //TODO make this always load CAPTCHA challenges, even if the user has already completed one
        setShowCaptchas(true);
    };

    const onChangeHandler = () => {
        setIsLogin(!isLogin);
        setMessage('');
    };

    const onSolved = ([result, commitmentId, tx, commitment]: TCaptchaSubmitResult) => {
        setShowCaptchas(false);

        status.update({info: ["onSolved:", result.status]});
        const payload = {
            email,
            name,
            password,
            web3Account: account.address,
            providerUrl: manager.state.providerUrl,
            commitmentId
        };
        fetch(`${manager.state.config.serverUrl}/${isLogin ? 'login' : 'signup'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then(async res => {
                try {
                    const jsonRes = await res.json();
                    if (res.status !== 200) {
                        setIsError(true);
                        setMessage(jsonRes.message);
                    } else {
                        onLoggedIn(jsonRes.token);
                        setIsError(false);
                        setMessage(jsonRes.message);
                    }
                } catch (err) {
                    console.log(err);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    const onChange = (solution: string[][]) => {
        console.log("onChange:", solution);
    };

    const onCancel = () => {
        setShowCaptchas(false);
        status.update({info: ""});
    };

    const clientInterface = useCaptcha({config}, {onAccountChange, onChange, onSubmit, onSolved, onCancel});

    const disconnectAccount = () => {
        clientInterface.onAccountUnset()
        status.update({info: ""});
    };

    const getMessage = () => {
        const status = isError ? `Error: ` : `Success: `;
        return status + message;
    }


    const manager = clientInterface.manager;
    const status = clientInterface.status;

    return (
        <div>
            <Procaptcha/>
            <Box className={"App"} sx={{width: "80%", display: "flex"}}>
                <Box>
                    {status.state.info && <Box className={"status"}>{status.state.info}</Box>}
                    {status.state.error && <Box className={"status error"}>{status.state.error}</Box>}
                    {message ? getMessage() : null}
                    {clientInterface.extension && !manager.state.account && showCaptchas && clientInterface.extension.getAccounts() &&
                    <ExtensionAccountSelect
                        value={manager.state.account}
                        options={clientInterface.extension.getAccounts()}
                        onChange={clientInterface.onAccountChange.bind(clientInterface)}
                    />}
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

                            {!isLogin &&
                            <FormControl>
                                <TextField
                                id="name"
                                label="Name"
                                type="text"
                                autoComplete="Name"
                                onChange={(e) => setName(e.target.value)}
                                />
                            </FormControl>
                            }

                            <FormControl>
                                <TextField
                                    id="password"
                                    label="Password"
                                    type="password"
                                    autoComplete="Password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </FormControl>

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

                    <CaptchaContextManager.Provider value={manager}>
                        <CaptchaComponent {...{clientInterface, show: showCaptchas}} />
                    </CaptchaContextManager.Provider>
                </Box>

            </Box>
        </div>
    );
}

export default App;
