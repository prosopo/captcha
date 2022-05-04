import React, { useState, useEffect, useMemo, SyntheticEvent } from "react";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
// import { HttpProvider } from "@polkadot/rpc-provider";
import {
  Box,
  Button,
  Typography,
  Autocomplete,
  TextField
} from "@mui/material";

// import config from "./config";

import {
  ProsopoRandomProviderResponse,
  ProsopoCaptchaResponse,
  ProsopoContract,
  Extension,
  ProviderApi,
  getExtension,
  getProsopoContract,
  ProCaptcha,
  getConfig
} from "@prosopo/procaptcha";

import {
  CaptchaWidget,
} from "@prosopo/procaptcha-react";

import "./App.css";
import { useStyles } from "./app.styles"; // TODO procatcha-react

// const { providerApi } = config;

function App() {

  const classes = useStyles();

  const [contractAddress, setContractAddress] = useState<string>('');
  const [contract, setContract] = useState<ProsopoContract | null>(null);
  const [extension, setExtension] = useState<Extension | null>(null);

  // const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [account, setAccount] = useState<InjectedAccountWithMeta | null>(null);

  const [showCaptchas, setShowCaptchas] = useState(false);
  const [totalCaptchas, setTotalCaptchas] = useState(0);
  const [currentCaptchaIndex, setCurrentCaptchaIndex] = useState(0);

  // let currentCaptcha: ProsopoCaptcha | undefined;
  // const accounts = contract.extension?.getAllAcounts();

  const [provider, setProvider] = useState<ProsopoRandomProviderResponse | null>(null);

  const [captchaChallenge, setCaptchaChallenge] = useState<ProsopoCaptchaResponse | null>(null);
  const [captchaSolution, setCaptchaSolution] = useState<number[]>([]);

  const providerApi = new ProviderApi(getConfig());

  useEffect(() => {
    Promise.all([providerApi.getContractAddress(), getExtension()])
      .then(result => {
          const [_contractAddress, _extension] = result;
          setContractAddress(_contractAddress.contractAddress);
          setExtension(_extension);
          // setAccounts(_extension.getAllAcounts());
          console.log("CONTRACT", _contractAddress.contractAddress);
      })
      .catch(err => {
          console.error(err);
      });

  }, []);

  useEffect(() => {
    setTotalCaptchas(captchaChallenge?.captchas.length ?? 0);
    setCurrentCaptchaIndex(0);
  }, [captchaChallenge]);

  useEffect(() => {
    console.log("CLICK SOLUTION", captchaSolution);
  }, [captchaSolution]);

  const toggleShowCaptchas = () => {
    setShowCaptchas(!showCaptchas);
    setAccount(null);
  };

  const cancelCaptchas = () => {
    setCaptchaChallenge(null);
    setShowCaptchas(false);
    setAccount(null);
    setCurrentCaptchaIndex(0);
  };

  const submitCaptchaSolution = async () => {
    if (!extension || !contract || !provider || !captchaChallenge) {
      // TODO throw error
      return;
    }

    const signer = extension.getInjected().signer;
    // const { nonce } = await contract.getApi().query.system.account(account.address!);
    console.log("SIGNER", signer);

    const proCaptcha = new ProCaptcha(contract, provider, providerApi);
    const currentCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
    const { captchaId, datasetId } = currentCaptcha.captcha;

    // TODO loading...

    try {
      const solved = await proCaptcha.solveCaptchaChallenge(signer, captchaChallenge.requestHash, captchaId, datasetId, captchaSolution);
      console.log("CAPTCHA SOLVED", solved);
      alert(solved.status);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }

    const nextCaptchaIndex = currentCaptchaIndex + 1;

    if (nextCaptchaIndex < totalCaptchas) {
      setCurrentCaptchaIndex(nextCaptchaIndex);
    } else {
      // TODO after all captchas solved.
      cancelCaptchas();
    }

  };


  const onAccountChange = (e: SyntheticEvent<Element, Event>, account: any) => {
    if (!extension || !contractAddress) {
      return;
    }
    extension.setAccount(account.address).then(async (account) => {
      setAccount(account);

      const _contract = await getProsopoContract(contractAddress, getConfig('dappAccount') as string, account);
      setContract(_contract);

      const _provider = await _contract.getRandomProvider();
      setProvider(_provider);

      console.log("PROVIDER", _provider);

      const proCaptcha = new ProCaptcha(_contract, _provider, providerApi);
      setCaptchaChallenge(await proCaptcha.getCaptchaChallenge());
    });
  };

  const onCaptchaSolutionClick = (index: number) => {
    if (captchaSolution.includes(index)) {
      setCaptchaSolution(captchaSolution.filter(item => item !== index));
    } else {
      setCaptchaSolution([...captchaSolution, index]);
    }
  }

  return (
    <Box className={classes.root}>
      {showCaptchas && !account && (
        <Autocomplete
          disablePortal
          id="select-accounts"
          options={extension?.getAllAcounts() || []}
          value={account}
          isOptionEqualToValue={(option, value) =>
            option.address === value.address
          }
          onChange={onAccountChange}
          sx={{ width: 550 }}
          getOptionLabel={(option: any) =>
            `${option.meta.name}\n${option.address}`
          }
          renderInput={(params) => (
            <TextField {...params} label="Select account" />
          )}
        />
      )}

      {showCaptchas && account && (
        <Box className={classes.captchasContainer}>
          <Box className={classes.captchasHeader}>
            <Typography className={classes.captchasHeaderLabel}>
              Select all images with a bus.
            </Typography>
          </Box>

          <Box className={classes.captchasBody}>

            {captchaChallenge && <CaptchaWidget challenge={captchaChallenge[currentCaptchaIndex]} solution={captchaSolution} solutionClickEvent={onCaptchaSolutionClick} />}

            <Box className={classes.dotsContainer}>
              {Array.from(Array(totalCaptchas).keys()).map((item, index) => {
                return (
                  <Box
                    key={index}
                    className={classes.dot}
                    style={{
                      backgroundColor: currentCaptchaIndex === item ? "#CFCFCF" : "#FFFFFF"
                    }}
                  />
                );
              })}
            </Box>

          </Box>

          <Box className={classes.captchasFooter}>
            <Button onClick={cancelCaptchas} variant="text">
              Cancel
            </Button>
            <Button onClick={submitCaptchaSolution} variant="contained">
              {currentCaptchaIndex === totalCaptchas - 1
                ? "Submit"
                : "Next"}
            </Button>
          </Box>
        </Box>
      )}

      {!showCaptchas && !account && (
        <Button
          onClick={toggleShowCaptchas}
          classes={{ root: classes.iAmHumanButton }}
        >
          <Typography className={classes.iAmHumanButtonLabel}>
            I am human
          </Typography>
        </Button>
      )}
    </Box>
  );
}

export default App;
