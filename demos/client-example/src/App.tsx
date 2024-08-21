// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ProcaptchaFrictionless } from "@prosopo/procaptcha-frictionless";
import { Procaptcha } from "@prosopo/procaptcha-react";
import { ApiParams, type ProcaptchaToken } from "@prosopo/types";
import { useReducer, useState } from "react";
import { ExtensionAccountSelect } from "./components/ExtensionAccountSelect.js";
import config from "./config.js";
import { Captcha } from "./Captcha.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Required for CORS support to work
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
  "Access-Control-Allow-Headers":
    "Origin, Content-Type, X-Auth-Token, Authorization",
};

interface AppProps {
  captchaType?: string;
}

function App(props: AppProps) {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState<string>("");
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState("");
  // whether the form is doing a login or a signup action
  const [isLogin, setIsLogin] = useState(true);
  // the result of the captcha process. Submit this to your backend server to verify the user is human on the backend
  const [procaptchaToken, setProcaptchaToken] = useState<
    ProcaptchaToken | undefined
  >(undefined);
  const [updateKey, forceUpdate] = useReducer((x) => x + 1, 0);

  console.log(config);

  const label = isLogin ? "Login" : "Sign up";
  const urlPath = isLogin ? "login" : "signup";

  const onLoggedIn = (token: string) => {
    const url = new URL("/private", config.serverUrl).href;
    console.log("getting private resource with token ", token, "at", url);
    fetch(url, {
      method: "GET",
      headers: {
        Origin: "http://localhost:9230", // TODO: change this to env var
        ...corsHeaders,
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        try {
          const jsonRes = await res.json();
          if (res.status === 200) {
            setMessage(jsonRes.message);
          }
        } catch (err) {
          console.log(err);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const onActionHandler = () => {
    if (!procaptchaToken) {
      alert("Must complete captcha");
    }
    const payload = {
      email,
      name,
      password,
      [ApiParams.procaptchaResponse]: procaptchaToken,
    };
    const url = new URL(urlPath, config.serverUrl).href;
    console.log("posting to", url, "with payload", payload);
    fetch(url, {
      method: "POST",
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        try {
          const jsonRes = await res.json();
          if (res.status !== 200) {
            setIsError(true);
            setMessage(jsonRes.message);
          } else {
            if (isLogin) {
              onLoggedIn(jsonRes.token);
            }
            setIsError(false);
            setMessage(jsonRes.message);
            forceUpdate();
          }
        } catch (err) {
          console.log(err);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const onChangeHandler = () => {
    setIsLogin(!isLogin);
    forceUpdate();
    setMessage("");
  };

  const getMessage = () => {
    if (isError) {
      return <Alert severity="error">{message}</Alert>;
    }
    return <Alert severity="success">{message}</Alert>;
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box
        className={"App"}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography component={"span"}>
            {message ? getMessage() : null}
          </Typography>

          <Box>
            <h1>{label}</h1>
            <form style={{ minWidth: "100px" }}>
              <FormGroup
                sx={{ "& .MuiTextField-root,#select-account": { m: 1 } }}
              >
                {!config.web2 ? (
                  <FormControl>
                    <ExtensionAccountSelect
                      dappName={config.dappName}
                      value={account}
                      onChange={setAccount}
                      aria-label="Select account"
                    />
                  </FormControl>
                ) : (
                  <></>
                )}
                <FormControl>
                  <TextField
                    id="email"
                    label="Email"
                    type="text"
                    autoComplete="email"
                    autoCapitalize="none"
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Email"
                  />
                </FormControl>

                {!isLogin && (
                  <FormControl>
                    <TextField
                      id="name"
                      label="Name"
                      type="text"
                      autoComplete="name"
                      onChange={(e) => setName(e.target.value)}
                      aria-label="Name"
                    />
                  </FormControl>
                )}

                <FormControl>
                  <TextField
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete="password"
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Password"
                  />
                </FormControl>
                <FormControl sx={{ m: 1 }}>
                  <Captcha
                    captchaType={props.captchaType}
                    setProcaptchaToken={setProcaptchaToken}
                    key={updateKey}
                  />
                </FormControl>
                <FormControl>
                  <Box sx={{ p: 1 }}>
                    <Stack
                      direction="column"
                      spacing={1}
                      sx={{ "& button": { m: 1 } }}
                    >
                      <Button
                        variant="contained"
                        onClick={onActionHandler}
                        aria-label={isLogin ? "Login" : "Sign up"}
                        disabled={!procaptchaToken}
                      >
                        {isLogin ? "Login" : "Sign up"}
                      </Button>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Box>
                          <Typography>- or -</Typography>
                        </Box>
                      </Box>
                      <Button
                        onClick={onChangeHandler}
                        aria-label={isLogin ? "Sign up" : "Login"}
                      >
                        {isLogin ? "Sign up" : "Login"}
                      </Button>
                    </Stack>
                  </Box>
                </FormControl>
              </FormGroup>
            </form>
          </Box>
        </Box>
      </Box>
    </div>
  );
}

export default App;
