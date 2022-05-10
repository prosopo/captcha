import React, { useState, useReducer } from "react";
// import { HttpProvider } from "@polkadot/rpc-provider";
import {
  Box,
  Button,
  Typography,
} from "@mui/material";

import config from "./config";

import { ProCaptchaComponent, ProCaptchaManager, CaptchaManagerState } from "@prosopo/procaptcha-react";

import "./App.css";

function App() {

  const [showCaptchas, setShowCaptchas] = useState(false);

  function reducer(state, action) {
    return { ...state, ...action };
  }

  const initialState = { account: null, contract: null, provider: null, extension: null } as CaptchaManagerState;
  const [state, dispatch] = useReducer(reducer, initialState);

  const toggleShowCaptcha = () => {
    setShowCaptchas(!showCaptchas);
  };

  const onAccountChange = (account) => {
    console.log("ACCOUNT CHANGED CALLBACK", account.address);
    // setAccount(account.address);
  }

  const onSubmit = (submitResult) => {
    console.log("CAPTCHA SUBMIT CALLBACK", submitResult);
    if (submitResult instanceof Error) {
      //
    }
  }

  const onCancel = () => {
    setShowCaptchas(false);
  };

  const onSolved = () => {
    console.log("ALL CAPTCHAS ANSWERED");
  }

  return (
    <Box className={"App"}>

      {showCaptchas && (
        <>
        <ProCaptchaManager.Provider value={{state, dispatch}}>
          <ProCaptchaComponent config={config} callbacks={{onAccountChange, onSubmit, onCancel, onSolved}} />
        </ProCaptchaManager.Provider>
        </>
      )}

      {!showCaptchas && (
        <Button
          onClick={toggleShowCaptcha}
          className={"iAmHumanButton"}
        >
          <Typography className={"iAmHumanButtonLabel"}>
            I am human
          </Typography>
        </Button>
      )}
    </Box>
  );
}

export default App;
