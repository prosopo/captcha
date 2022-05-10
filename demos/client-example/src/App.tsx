import React, { useState } from "react";
// import { HttpProvider } from "@polkadot/rpc-provider";
import {
  Box,
  Button,
  Typography,
} from "@mui/material";

import config from "./config";

import { ProCaptchaComponent } from "@prosopo/procaptcha-react";

import "./App.css";

function App() {

  const [showCaptchas, setShowCaptchas] = useState(false);

  const [account, setAccount] = useState('');

  const onAccountChange = (account) => {
    console.log("ACCOUNT CHANGED CALLBACK", account.address);
    setAccount(account.address);
  }

  const onCancel = () => {
    setShowCaptchas(false);
  };

  const toggleShowCaptcha = () => {
    setShowCaptchas(!showCaptchas);
  };

  return (
    <Box className={"App"}>

      {showCaptchas && (
        <ProCaptchaComponent config={config} callbacks={{onAccountChange, onCancel}} />
      )}

      {!showCaptchas && (
        <Button
          onClick={toggleShowCaptcha}
          classes={"iAmHumanButton"}
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
