import { useState, useReducer } from "react";
import { Box, Button, Typography } from "@mui/material";

import {
  captchaContextReducer,
  statusReducer,
  TCaptchaSubmitResult,
  TExtensionAccount,
  ProsopoCaptchaClient,
} from "@prosopo/procaptcha";

import {
  CaptchaComponent,
  CaptchaManager,
  ExtensionAccountSelect,
} from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";

function App() {

  const [state, update] = useReducer(captchaContextReducer, { config });
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

  const onSubmit = (submitResult: TCaptchaSubmitResult) => {
    if (submitResult instanceof Error) {
      updateStatus({ error: "ERROR" + submitResult.message });
      return;
    }
    const [result, tx] = submitResult;
    updateStatus({ info: result.status });

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
    updateStatus({ info: "All captchas answered correctly..." });
  }

  const onClick = (solution: number[]) => {
    console.log("onClick: ", solution);
  }

  const clientInterface = new ProsopoCaptchaClient({ state, update }, { state: status, update: updateStatus }, { onAccountChange, onSubmit, onCancel, onSolved, onClick });

  return (
    <Box className={"App"}>

      {status.info && <Box className={"status"}>{status.info}</Box>}
      {status.error && <Box className={"status error"}>{status.error}</Box>}

      <CaptchaManager.Provider value={{ state, update }}>

        {state.extension && !state.account &&
          <ExtensionAccountSelect
            value={state.account}
            options={state.extension.getAllAcounts()}
            onChangeEvent={clientInterface.onExtensionAccountChange.bind(clientInterface)}
          />}

        {showCaptchas &&
          <CaptchaComponent clientInterface={clientInterface} />}

      </CaptchaManager.Provider>

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
