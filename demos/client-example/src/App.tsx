import { useState, useReducer, Reducer } from "react";
import { Box, Button, Typography } from "@mui/material";

import { ProCaptchaComponent, ProCaptchaManager, captchaManagerReducer, TSubmitResult, TExtensionAccount } from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";

function App() {

  const [state, dispatch] = useReducer(captchaManagerReducer, {});

  const [showCaptchas, setShowCaptchas] = useState(false);

  const [status, setStatus] = useState('');

  const toggleShowCaptcha = () => {
    setShowCaptchas(!showCaptchas);
  };

  const onAccountChange = (account: TExtensionAccount) => {
    console.log("onAccountChange: ACCOUNT CHANGED", account.address);
    setStatus("Selected account: " + account.meta.name);
  }

  const onSubmit = (submitResult: TSubmitResult) => {
    if (submitResult instanceof Error) {
      // setStatus(submitResult.message);
      return;
    }
    const [result, tx] = submitResult;
    // setStatus(result.status);

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

  return (
    <Box className={"App"}>

      {status && <Box className={"status"}>{status}</Box>}

      {showCaptchas &&
        <ProCaptchaManager.Provider value={{state, dispatch}}>
          <ProCaptchaComponent config={config} callbacks={{onAccountChange, onSubmit, onCancel, onSolved, onClick}} />
        </ProCaptchaManager.Provider>
      }

      {!showCaptchas &&
        <Button
          onClick={toggleShowCaptcha}
          className={"iAmHumanButton"}
        >
          <Typography className={"iAmHumanButtonLabel"}>
            I am human
          </Typography>
        </Button>
      }
    </Box>
  );
}

export default App;
