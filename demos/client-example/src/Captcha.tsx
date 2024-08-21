import { FormControl } from "@mui/material";
import { ProcaptchaFrictionless } from "@prosopo/procaptcha-frictionless";
import config from "./config.js";
import { Procaptcha } from "@prosopo/procaptcha-react";
import type { ProcaptchaToken } from "@prosopo/types";

type CaptchProps = {
  captchaType?: string;
  setProcaptchaToken: (procaptchaToken: ProcaptchaToken) => void;
  key: number;
};

const onError = (error: Error) => {
  alert(error.message);
};

const onExpired = () => {
  alert("Challenge has expired");
};

export function Captcha(props: CaptchProps) {
  const onHuman = async (procaptchaToken: ProcaptchaToken) => {
    console.log("onHuman", procaptchaToken);
    props.setProcaptchaToken(procaptchaToken);
  };

  return (
    <div>
      {props.captchaType === "frictionless" ? (
        <ProcaptchaFrictionless
          config={config}
          callbacks={{ onError, onHuman, onExpired }}
          aria-label="Frictionless captcha"
        />
      ) : (
        <Procaptcha
          config={config}
          callbacks={{ onError, onHuman, onExpired }}
          aria-label="Captcha"
        />
      )}
    </div>
  );
}
