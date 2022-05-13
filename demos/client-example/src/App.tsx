import { useState, useReducer } from "react";
import { Box, Button, Typography } from "@mui/material";

import {
  captchaManagerReducer,
  statusReducer,
  TSubmitResult,
  TExtensionAccount,
  ProCaptchaClient,
} from "@prosopo/procaptcha";

import {
  ProCaptchaComponent,
  ProCaptchaManager,
  ExtensionAccountSelect,
} from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";

function App() {

  const [state, dispatch] = useReducer(captchaManagerReducer, { config });
  const [status, updateStatus] = useReducer(statusReducer, {});

  const [showCaptchas, setShowCaptchas] = useState(false);

  const showCaptchaClick = () => {
    setShowCaptchas(true);
    updateStatus({ info: "" });
  };

  const onAccountChange = (account: TExtensionAccount) => {
    console.log("onAccountChange: ACCOUNT CHANGED", account.address);
    updateStatus({ info: "Selected account: " + account.meta.name });
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
    updateStatus({ info: "" });
  };

  const onSolved = () => {
    setShowCaptchas(false);
    console.log("onSolved: ALL CAPTCHAS ANSWERED");
    updateStatus({ info: "All captchas answered..." });
  }

  const onClick = (solution: number[]) => {
    console.log("onClick: ", solution);
  }

  const clientInterface = new ProCaptchaClient({ state, dispatch }, { status, updateStatus }, { onAccountChange, onSubmit, onCancel, onSolved, onClick });

  return (
    <Box className={"App"}>

      {status.info && <Box className={"status"}>{status.info}</Box>}
      {status.error && <Box className={"status error"}>{status.error}</Box>}

      <ProCaptchaManager.Provider value={{ state, dispatch }}>

        {state.extension && !state.account &&
          <ExtensionAccountSelect
            value={state.account}
            options={state.extension.getAllAcounts()}
            onChangeEvent={clientInterface.onExtensionAccountChange.bind(clientInterface)}
          />}

        {showCaptchas &&
          <ProCaptchaComponent clientInterface={clientInterface} />}

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
