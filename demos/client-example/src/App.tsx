import {useState} from "react";
import {StyleSheet, Text, View, TextInput, TouchableOpacity} from 'react-native';
import {Box, Button, Typography} from "@mui/material";

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

const styles = StyleSheet.create({
    image: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    card: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        width: '80%',
        marginTop: '40%',
        borderRadius: 20,
        maxHeight: 380,
        paddingBottom: '30%',
    },
    heading: {
        fontSize: 30,
        fontWeight: 'bold',
        marginLeft: '10%',
        marginTop: '5%',
        marginBottom: '30%',
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
});


function App() {

    const [showCaptchas, setShowCaptchas] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

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
        const payload = {
            email,
            name,
            password,
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
                };
            })
            .catch(err => {
                console.log(err);
            });
    };

    const onChangeHandler = () => {
        setIsLogin(!isLogin);
        setMessage('');
    };

    const onSolved = ([result, tx, commitment]: TCaptchaSubmitResult) => {
        setShowCaptchas(false);

        status.update({info: ["onSolved:", result.status]});
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
    console.log(manager.state);

    return (
        <Box className={"App"}>
            <div className={"flex-container"}>


                <div style={{order: 1}}>
                    {status.state.info && <Box className={"status"}>{status.state.info}</Box>}
                    {status.state.error && <Box className={"status error"}>{status.state.error}</Box>}
                    {clientInterface.getExtension() && !manager.state.account && showCaptchas &&
                        <ExtensionAccountSelect
                        value={manager.state.account}
                        options={clientInterface.getExtension().getAccounts()}
                        onChange={clientInterface.onAccountChange.bind(clientInterface)}
                      />}
                    <View style={styles.card}>
                        <Text style={styles.heading}>{isLogin ? 'Login' : 'Signup'}</Text>
                        <View style={styles.form}>
                            <View style={styles.inputs}>
                                <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" onChangeText={setEmail}></TextInput>
                                {!isLogin && <TextInput style={styles.input} placeholder="Name" onChangeText={setName}></TextInput>}
                                <TextInput secureTextEntry={true} style={styles.input} placeholder="Password" onChangeText={setPassword}></TextInput>
                                <Text style={[styles.message, {color: isError ? 'red' : 'green'}]}>{message ? getMessage() : null}</Text>
                                <TouchableOpacity style={styles.button} onPress={onSubmitHandler}>
                                    <Text style={styles.buttonText}>Done</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.buttonAlt} onPress={onChangeHandler}>
                                    <Text style={styles.buttonAltText}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <CaptchaContextManager.Provider value={manager}>
                        {showCaptchas &&
                          <CaptchaComponent {...{clientInterface}} />}
                    </CaptchaContextManager.Provider>

                    {!showCaptchas &&
                      <Button
                        onClick={showCaptchaClick}
                        className={"iAmHumanButton"}
                        {...addDataAttr({dev: {cy: 'button-human'}})}
                      >
                        <Typography className={"iAmHumanButtonLabel"}>
                          I am human
                        </Typography>
                      </Button>}
                    {manager.state.account && !manager.state.config.web2 &&
                      <Button onClick={disconnectAccount} className={"iAmHumanButton"}>
                        <Typography className={"iAmHumanButtonLabel"}>
                          Disconnect account
                        </Typography>
                      </Button>}
                </div>
            </div>

        </Box>
    );
}

export default App;
