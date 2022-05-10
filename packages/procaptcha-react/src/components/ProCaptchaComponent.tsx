import React, { useState, useEffect, useContext, SyntheticEvent } from "react";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

import {
    Box,
    Button,
    Typography,
    Autocomplete,
    TextField
} from "@mui/material";

import {
    ProsopoRandomProviderResponse,
    ProsopoCaptchaResponse,
    ProsopoContract,
    Extension,
    ProviderApi,
    getExtension,
    getProsopoContract,
    ProCaptcha,
    ProCaptchaConfig,
    CaptchaSolutionResponse
} from "@prosopo/procaptcha";

import {
    useStyles,
} from "../styles";

import CaptchaWidget from "./CaptchaWidget";

import { ProCaptchaManager, IProCaptchaManager } from "./ProCaptchaManager";

export interface ProCaptchaCallbacks {
    onSubmit?: (result: CaptchaSolutionResponse | Error, captchaChallenge: ProsopoCaptchaResponse | null, captchaIndex: number) => void;
    onCancel?: () => void;
    onSolved?: () => void;
    onLoadExtension?: (extension: Extension | null) => void;
    onAccountChange?: (account: InjectedAccountWithMeta | null,
        contract: ProsopoContract | null,
        provider: ProsopoRandomProviderResponse | null,
    ) => void;
}

export function ProCaptchaComponent({ config, callbacks }: { config: ProCaptchaConfig, callbacks?: ProCaptchaCallbacks }) {

    const classes = useStyles();

    const context: IProCaptchaManager = useContext(ProCaptchaManager);

    const { account, contract, provider } = context.state;

    const [contractAddress, setContractAddress] = useState<string>('');
    const [extension, setExtension] = useState<Extension | null>(null);

    const [totalCaptchas, setTotalCaptchas] = useState(0);
    const [currentCaptchaIndex, setCurrentCaptchaIndex] = useState(0);
    const [captchaChallenge, setCaptchaChallenge] = useState<ProsopoCaptchaResponse | null>(null);
    const [captchaSolution, setCaptchaSolution] = useState<number[]>([]);

    // const [account, setAccount] = useState<InjectedAccountWithMeta | null>(null);
    // const [contract, setContract] = useState<ProsopoContract | null>(null);
    // const [provider, setProvider] = useState<ProsopoRandomProviderResponse | null>(null);

    const providerApi = new ProviderApi(config);

    useEffect(() => {

        Promise.resolve(getExtension())
            .then(_extension => {
                setExtension(_extension);
                if (callbacks?.onLoadExtension) {
                    callbacks.onLoadExtension(_extension);
                }
            })
            .catch(err => {
                console.error("FAILED TO GET EXTENSION", err);
            });

        if (contract) {
            setContractAddress(contract.address);
        } else {
            Promise.resolve(providerApi.getContractAddress())
                .then(_contractAddress => {
                    setContractAddress(_contractAddress.contractAddress)
                })
                .catch(err => {
                    console.error("FAILED TO GET CONTRACT ADDRESS", err);
                });
        }

        if (contract && provider) {
            newCaptchaChallenge(contract, provider);
        }

    }, []);

    useEffect(() => {
        setTotalCaptchas(captchaChallenge?.captchas.length ?? 0);
        setCurrentCaptchaIndex(0);
    }, [captchaChallenge]);

    const cancelCaptcha = () => {
        // setAccount(null);
        setCaptchaChallenge(null);
        setCurrentCaptchaIndex(0);

        if (callbacks?.onCancel) {
            callbacks.onCancel();
        }
    };

    const submitCaptcha = async () => {
        if (!extension || !contract || !provider || !captchaChallenge) {
            // TODO throw error
            return;
        }

        const signer = extension.getInjected().signer;
        console.log("SIGNER", signer);

        const proCaptcha = new ProCaptcha(contract, provider, providerApi);
        const currentCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
        const { captchaId, datasetId } = currentCaptcha.captcha;

        // TODO loading...

        let submitResult: CaptchaSolutionResponse | Error;

        try {
            submitResult = await proCaptcha.solveCaptchaChallenge(signer, captchaChallenge.requestHash, captchaId, datasetId, captchaSolution);
            // alert(submitResult.status); // TODO
        } catch (err) {
            submitResult = err;
            console.error(err);
            // alert(err.message);
        } finally {
            setCaptchaSolution([]);
        }

        if (callbacks?.onSubmit) {
            callbacks.onSubmit(submitResult, captchaChallenge, currentCaptchaIndex);
            if (submitResult instanceof Error) {
                // TODO after any captcha failed.
                cancelCaptcha();
            }
        }

        const nextCaptchaIndex = currentCaptchaIndex + 1;

        if (nextCaptchaIndex < totalCaptchas) {
            setCurrentCaptchaIndex(nextCaptchaIndex);
        } else {
            if (callbacks?.onSolved) {
                callbacks.onSolved();
            }
            cancelCaptcha(); // TODO after all captchas solved.
        }
    };

    const onAccountChange = (e: SyntheticEvent<Element, Event>, account: any) => {
        if (!extension || !contractAddress) {
            return;
        }
        extension.setAccount(account.address).then(async (_account) => {
            // setAccount(account);
            context.dispatch({account: _account});

            const _contract = await getProsopoContract(contractAddress, config['dappAccount'], account);

            context.dispatch({contract: _contract});
    
            const _provider = await _contract.getRandomProvider();

            context.dispatch({provider: _provider});

            if (callbacks?.onAccountChange) {
                callbacks.onAccountChange(account, _contract, _provider);
            }

            newCaptchaChallenge(_contract, _provider);
        });
    };

    const newCaptchaChallenge = async (_contract: ProsopoContract, _provider: ProsopoRandomProviderResponse) => {
        const proCaptcha = new ProCaptcha(_contract, _provider, providerApi);
        const _captchaChallenge = await proCaptcha.getCaptchaChallenge();
        setCaptchaChallenge(_captchaChallenge);
    };

    const onCaptchaSolutionClick = (index: number) => {
        const _captchaSolution = captchaSolution.includes(index) ? captchaSolution.filter(item => item !== index) : [...captchaSolution, index];
        setCaptchaSolution(_captchaSolution);
        console.log("CLICK SOLUTION", captchaSolution);
    };

    return (
        <Box className={classes.root}>
            {!account &&
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
            }

            {account && captchaChallenge &&
                <Box className={classes.captchasContainer}>
                    <Box className={classes.captchasHeader}>
                        <Typography className={classes.captchasHeaderLabel}>
                            Select all images with [TODO]
                        </Typography>
                    </Box>

                    <Box className={classes.captchasBody}>

                        <CaptchaWidget challenge={captchaChallenge[currentCaptchaIndex]} solution={captchaSolution} solutionClickEvent={onCaptchaSolutionClick} />

                        <Box className={classes.dotsContainer}>
                            {Array.from(Array(totalCaptchas).keys()).map((item, index) => {
                                return <Box key={index} className={(currentCaptchaIndex === item) ? classes.dot : classes.dotActive} />;
                            })}
                        </Box>

                    </Box>

                    <Box className={classes.captchasFooter}>
                        <Button onClick={cancelCaptcha} variant="text">
                            Cancel
                        </Button>
                        <Button onClick={submitCaptcha} variant="contained">
                            {currentCaptchaIndex === totalCaptchas - 1
                                ? "Submit"
                                : "Next"}
                        </Button>
                    </Box>
                </Box>
            }

        </Box>
    );
}

export default ProCaptchaComponent;
