import { useState, useReducer } from "react";
import { Box, Button, Typography } from "@mui/material";

import { ProCaptchaComponent, ProCaptchaManager, CaptchaManagerState, TSubmitResult, TExtensionAccount } from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";

function App() {

  const [showCaptchas, setShowCaptchas] = useState(false);

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const reducer = (state: CaptchaManagerState, action: Partial<CaptchaManagerState>) => {
    return { ...state, ...action };
  }

  const [state, dispatch] = useReducer<CaptchaManagerState>(reducer, {});

  const toggleShowCaptcha = () => {
    setShowCaptchas(!showCaptchas);
    setStatus("");
    setError("");
  };

  const onAccountChange = (account: TExtensionAccount) => {
    console.log("ACCOUNT CHANGED CALLBACK", account.address);
    // setAccount(account.address);
  }

  const onSubmit = (submitResult: TSubmitResult) => {
    if (submitResult instanceof Error) {
      setError(submitResult.message);
      setStatus("");
      return;
    }
    const [result, tx] = submitResult;
    setStatus(result.status);
    setError("");
    
    console.log("CAPTCHA SUBMIT CALLBACK", result);
    console.log("CAPTCHA SUBMIT CALLBACK TX", tx);
  }

  const onCancel = () => {
    setShowCaptchas(false);
    setStatus("");
    setError("");
  };

  const onSolved = () => {
    setShowCaptchas(false);
    console.log("ALL CAPTCHAS ANSWERED");
    setStatus("All captchas answered...");
  }

  return (
    <Box className={"App"}>

      {status && <Box className={"status"}>{status}</Box>}
      {error && <Box className={"status error"}>{error}</Box>}

      {showCaptchas &&
        <ProCaptchaManager.Provider value={{state, dispatch}}>
          <ProCaptchaComponent config={config} callbacks={{onAccountChange, onSubmit, onCancel, onSolved}} />
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
