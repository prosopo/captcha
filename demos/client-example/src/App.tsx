import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";

import {
  TCaptchaSubmitResult,
  TExtensionAccount,
} from "@prosopo/procaptcha";

import {
  CaptchaComponent,
  CaptchaContextManager,
  ExtensionAccountSelect,
  useCaptcha,
} from "@prosopo/procaptcha-react";

import config from "./config";

import "./App.css";
import {CaptchaSolutionCommitment} from "@prosopo/provider";

function App() {

  const [showCaptchas, setShowCaptchas] = useState(false);

  const showCaptchaClick = () => {
    setShowCaptchas(true);
    status.update({ info: "" });
  };

  const onAccountChange = (account: TExtensionAccount) => {
    setShowCaptchas(true);
    status.update({ info: "Selected account: " + account?.meta.name });
    console.log("CAPTCHA API", clientInterface.getCaptchaApi());
  };

  const onSubmit = (submitResult: TCaptchaSubmitResult) => {
    if (submitResult instanceof Error) {
      status.update({ error: ["onSubmit: CAPTCHA SUBMIT ERROR", submitResult] });
      return;
    }
    const [result, tx] = submitResult;
    status.update({ info: ["onSubmit: CAPTCHA SUBMIT STATUS", result.status] });
  };

  const onSolved = ([result, tx,  commitment]: TCaptchaSubmitResult) => {
    setShowCaptchas(false);

    status.update({ info: ["onSolved:", `Captcha solution status: ${commitment.status}`] });
  }

  const onChange = (solution: number[][]) => {
    console.log("onChange:", solution);
  };

  const onCancel = () => {
    setShowCaptchas(false);
    status.update({ info: "" });
  };

  const clientInterface = useCaptcha({ config }, { onAccountChange, onChange, onSubmit, onSolved, onCancel });

  const manager = clientInterface.manager;
  const status = clientInterface.status;

  return (
    <Box className={"App"}>

      {status.state.info && <Box className={"status"}>{status.state.info}</Box>}
      {status.state.error && <Box className={"status error"}>{status.state.error}</Box>}

      <CaptchaContextManager.Provider value={manager}>

        {clientInterface.getExtension() && !manager.state.account &&
          <ExtensionAccountSelect
            value={manager.state.account}
            options={clientInterface.getExtension().getAccounts()}
            onChange={clientInterface.onAccountChange.bind(clientInterface)}
          />}

        {showCaptchas &&
          <CaptchaComponent {...{ clientInterface }} />}

      </CaptchaContextManager.Provider>

      {!showCaptchas &&
        <Button onClick={showCaptchaClick} className={"iAmHumanButton"}>
          <Typography className={"iAmHumanButtonLabel"}>
            I am human
          </Typography>
        </Button>}

    </Box>
  );
}

export default App;
