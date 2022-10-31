import {useState} from "react";
import {Box, Button, Modal, Typography} from "@mui/material";

import {
    TCaptchaSubmitResult,
    TExtensionAccount,
} from "@prosopo/procaptcha";

import {
    CaptchaComponent,
    CaptchaContextManager,
    ExtensionAccountSelect,
    useCaptcha,
    addDataAttr
} from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";

const styles = {
    image: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    card: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        width: '80%',
        marginTop: '5%',
        borderRadius: 20,
        maxHeight: 380,
        paddingBottom: '5%',
    },
    heading: {
        fontSize: 30,
        fontWeight: 'bold',
        marginLeft: '10%',
        marginTop: '5%',
        marginBottom: '5%',
        color: 'black',
    },
    form: {
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: '5%',
    },
    inputs: {
        width: '100%',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '10%',
    },
    input: {
        width: '80%',
        borderBottomWidth: 1,
        borderBottomColor: 'black',
        paddingTop: 10,
        fontSize: 16,
        minHeight: 40,
    },
    button: {
        width: '80%',
        backgroundColor: 'black',
        height: 40,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '400'
    },
    buttonAlt: {
        width: '80%',
        borderWidth: 1,
        height: 40,
        borderRadius: 50,
        borderColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 5,
    },
    buttonAltText: {
        color: 'black',
        fontSize: 16,
        fontWeight: '400',
    },
    message: {
        fontSize: 16,
        marginVertical: '5%',
    },
};


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
        if(account) {
            //setShowCaptchas(true);
            status.update({info: "Selected account: " + account?.meta.name});
            setAccount(account);
            console.log("CAPTCHA API", clientInterface.getCaptchaApi());
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
                };
            })
            .catch(err => {
                console.log(err);
            });
    }

    const onSubmitHandler = () => {
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
            web3Account: account,
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
        <Box className={"App"}>
            <div className={"flex-container"}>


                <div style={{order: 1}}>
                    {status.state.info && <Box className={"status"}>{status.state.info}</Box>}
                    {status.state.error && <Box className={"status error"}>{status.state.error}</Box>}
                    {clientInterface.getExtension() && !manager.state.account && showCaptchas && clientInterface.getExtension().getAccounts() &&
                        <ExtensionAccountSelect
                        value={manager.state.account}
                        options={clientInterface.getExtension().getAccounts()}
                        onChange={clientInterface.onAccountChange.bind(clientInterface)}
                      />}
                    <div style={styles.card}>
                        <h1 style={styles.heading}>{isLogin ? 'Login' : 'Signup'}</h1>
                        <form style={styles.form}>
                            <div style={styles.inputs}>
                                <input style={styles.input} placeholder="Email" autoCapitalize="none" onChange={(e) => setEmail(e.target.value)}></input>
                                {!isLogin && <input style={styles.input} placeholder="Name" onChange={(e) => setName(e.target.value)}></input>}
                                <input type="password" style={styles.input} placeholder="Password" onChange={(e) => setPassword(e.target.value)}></input>
                                <span style={styles.message}>{message ? getMessage() : null}</span>
                                <Button style={styles.button} onClick={onSubmitHandler}>
                                    <Typography style={styles.buttonText}>Done</Typography>
                                </Button>
                                <Button style={styles.buttonAlt} onClick={onChangeHandler}>
                                    <Typography style={styles.buttonAltText}>{isLogin ? 'Sign Up' : 'Log In'}</Typography>
                                </Button>
                            </div>
                        </form>
                    </div>

                    <CaptchaContextManager.Provider value={manager}>
                        <CaptchaComponent {...{clientInterface, show: showCaptchas}} />
                    </CaptchaContextManager.Provider>
                </div>
            </div>

        </Box>
    );
}

export default App;
