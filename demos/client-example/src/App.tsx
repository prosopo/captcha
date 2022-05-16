import { useState, useReducer, Reducer, SyntheticEvent } from "react";
import { Box, Button, Typography } from "@mui/material";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import {
  ProCaptchaComponent,
  ProCaptchaManager,
  captchaManagerReducer,
  TSubmitResult,
  TExtensionAccount,
  ExtensionAccountSelect,
  onExtensionAccountChange
} from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";

function App() {

  const [state, dispatch] = useReducer(captchaManagerReducer, {config});

  const [showCaptchas, setShowCaptchas] = useState(false);

  const [status, setStatus] = useState('');

  const showCaptchaClick = () => {
    setShowCaptchas(true);
    setStatus("");
  };

  const onAccountChange = (account: TExtensionAccount) => {
    console.log("onAccountChange: ACCOUNT CHANGED", account.address);
    setStatus("Selected account: " + account.meta.name);
    setShowCaptchas(true);
  }

  const onSubmit = (submitResult: TSubmitResult) => {
    if (submitResult instanceof Error) {
      return;
    }
    const [result, tx] = submitResult;

    console.log("onSubmit: CAPTCHA SUBMIT RESULT", result);
    console.log("onSubmit: CAPTCHA SUBMIT TX", tx);
  }

  const onCancel = () => {
    setShowCaptchas(false);
    setStatus("");
  };

  const onSolved = () => {
    setShowCaptchas(false);
    console.log("onSolved: ALL CAPTCHAS ANSWERED");
    setStatus("All captchas answered...");
  }

  const onClick = (solution: number[]) => {
    console.log("onClick: ", solution);
  }

  const onAccountChangeEvent = (e: SyntheticEvent<Element, Event>, account: InjectedAccountWithMeta | null) => {
    if (!account || !state.extension || !state.contractAddress) {
        return;
    }
    onExtensionAccountChange(account, {state, dispatch}, (account, contract, provider) => {
      onAccountChange(account);
    });
  };

  return (
    <Box className={"App"}>

      {status && <Box className={"status"}>{status}</Box>}

      <ProCaptchaManager.Provider value={{state: state, dispatch}}>
        {state.extension && !state.account && <ExtensionAccountSelect value={state.account} options={state.extension?.getAllAcounts() || []} onChange={onAccountChangeEvent} />}
        {showCaptchas && <ProCaptchaComponent callbacks={{onAccountChange, onSubmit, onCancel, onSolved, onClick}} />}
      </ProCaptchaManager.Provider>

      {!showCaptchas &&
        <Button
          onClick={showCaptchaClick}
          className={"iAmHumanButton"}
        >
          <Typography className={"iAmHumanButtonLabel"}>
            I am human
          </Typography>
        </Button>}

    </Box>
  );
}

export default App;
