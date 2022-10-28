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


function App() {

    const [showCaptchas, setShowCaptchas] = useState(false);

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


    const manager = clientInterface.manager;
    const status = clientInterface.status;
    console.log("manager", manager);

    return (
        <Box className={"App"}>
            <div className={"flex-container"}>
                <div style={{order: 1}}>
                    <span>
                      <pre id="json">{JSON.stringify(manager.state, null, 2)}</pre>
                    </span>
                </div>

                <div style={{order: 2}}>
                    {status.state.info && <Box className={"status"}>{status.state.info}</Box>}
                    {status.state.error && <Box className={"status error"}>{status.state.error}</Box>}
                    {clientInterface.getExtension() && !manager.state.account && showCaptchas &&
                        <ExtensionAccountSelect
                        value={manager.state.account}
                        options={clientInterface.getExtension().getAccounts()}
                        onChange={clientInterface.onAccountChange.bind(clientInterface)}
                      />}


                    <CaptchaContextManager.Provider value={manager}>
                        <CaptchaComponent {...{clientInterface, show: showCaptchas}} />
                    </CaptchaContextManager.Provider>
                    <Button 
                        onClick={showCaptchaClick} 
                        className={"iAmHumanButton"}
                        {...addDataAttr({dev: {cy: 'button-human'}})}
                      >
                      <Typography className={"iAmHumanButtonLabel"}>
                        I am human
                      </Typography>
                    </Button>
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
