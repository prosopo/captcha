import React, { useState, useEffect, useContext, useReducer, SyntheticEvent } from "react";
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
    CaptchaSolutionResponse,
    TransactionResponse
} from "@prosopo/procaptcha";

import { ProCaptchaManager, IProCaptchaManager } from "./ProCaptchaManager";

import { CaptchaWidget } from "./CaptchaWidget";

import { useStyles } from "../styles";

// TODO ...
export type TSubmitResult = [CaptchaSolutionResponse, TransactionResponse] | Error;
export type TExtensionAccount = InjectedAccountWithMeta;

export interface CaptchaEventCallbacks {
    onSubmit?: (result: TSubmitResult, captchaChallenge: ProsopoCaptchaResponse, captchaIndex: number) => void;
    onCancel?: () => void;
    onSolved?: () => void;
    onClick?: (captchaSolution: number[]) => void;
    onBeforeLoadCaptcha?: (contract: ProsopoContract, provider: ProsopoRandomProviderResponse) => void;
    onLoadCaptcha?: (captchaChallenge: ProsopoCaptchaResponse) => void;
    onLoadExtension?: (extension: Extension) => void;
    onAccountChange?: (account: TExtensionAccount,
        contract: ProsopoContract,
        provider: ProsopoRandomProviderResponse,
    ) => void;
}

export function ProCaptchaComponent({ config, callbacks }: { config: ProCaptchaConfig, callbacks?: CaptchaEventCallbacks }) {

    const classes = useStyles();

    const context: IProCaptchaManager = useContext(ProCaptchaManager);

    const { account, contract, provider, extension } = context.state;

    const [contractAddress, setContractAddress] = useState<string>("");

    const [captchaChallenge, setCaptchaChallenge] = useState<ProsopoCaptchaResponse>();
    const [totalCaptchas, setTotalCaptchas] = useState(0);
    const [currentCaptchaIndex, setCurrentCaptchaIndex] = useState(0);
    const [captchaSolution, setCaptchaSolution] = useState<number[]>([]);

    const statusReducer = (state: {info?: string, error?: string}, action: {info?: string | [string, string], error?: string | [string, string]}) => {
        const logger = {info: console.log, error: console.error};
        for (const key in action) {
            logger[key](action[key]);
            return {[key]: Array.isArray(action[key]) ? action[key][1] : action[key]};
        }
        return {};
    }

    const [status, setStatus] = useReducer(statusReducer, {});

    const providerApi = new ProviderApi(config);

    let init = false;

    useEffect(() => {

        if (init) {
            return;
        }

        init = true;

        if (!extension) {
            getExtension()
                .then(_extension => {
                    context.dispatch({extension: _extension});
                    if (callbacks?.onLoadExtension) {
                        callbacks.onLoadExtension(_extension);
                    }
                })
                .catch(err => {
                    setStatus({error: ["FAILED TO GET EXTENSION", err.message]});
                });
        }

        if (contract) {
            setContractAddress(contract.address);
        } else {
            providerApi.getContractAddress()
                .then(_contractAddress => {
                    setContractAddress(_contractAddress.contractAddress)
                })
                .catch(err => {
                    setStatus({error: ["FAILED TO GET CONTRACT ADDRESS", err.message]});
                });
            return;
        }

        if (provider && !captchaChallenge) {
            newCaptchaChallenge(contract, provider);
        }

    }, []);

    useEffect(() => {
        setTotalCaptchas(captchaChallenge?.captchas.length ?? 0);
        setCurrentCaptchaIndex(0);
    }, [captchaChallenge]);

    const dismissCaptcha = () => {
        setCaptchaChallenge(undefined);
    }

    const cancelCaptcha = () => {
        dismissCaptcha();
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

        const proCaptcha = new ProCaptcha(contract, provider, providerApi);
        const currentCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
        const { captchaId, datasetId } = currentCaptcha.captcha;

        // TODO loading...

        let submitResult: [CaptchaSolutionResponse, TransactionResponse] | Error;

        try {
            submitResult = await proCaptcha.solveCaptchaChallenge(signer, captchaChallenge.requestHash, captchaId, datasetId, captchaSolution);
            setStatus({info: ["SUBMIT CAPTCHA RESULT", submitResult[0].status]});
        } catch (err) {
            submitResult = err as Error;
            setStatus({error: ["FAILED TO SUBMIT CAPTCHA", submitResult.message]});
        } finally {
            setCaptchaSolution([]);
        }

        if (callbacks?.onSubmit) {
            callbacks.onSubmit(submitResult, captchaChallenge, currentCaptchaIndex);
        }

        const nextCaptchaIndex = currentCaptchaIndex + 1;

        if (nextCaptchaIndex < totalCaptchas) {
            setCurrentCaptchaIndex(nextCaptchaIndex);
        } else {
            if (callbacks?.onSolved) {
                callbacks.onSolved();
            }
            // TODO after all captchas solved.
            setStatus({info: "All captchas answered..."});
            dismissCaptcha();
        }
    };

    const onAccountChange = (e: SyntheticEvent<Element, Event>, account: InjectedAccountWithMeta | null) => {
        if (!account || !extension || !contractAddress) {
            return;
        }
        extension.setAccount(account.address).then(async (_account) => {
            context.dispatch({account: _account});

            const _contract = await getProsopoContract(contractAddress, config['dappAccount'], _account);
            context.dispatch({contract: _contract});
    
            const _provider = await _contract.getRandomProvider();
            context.dispatch({provider: _provider});

            if (callbacks?.onAccountChange) {
                callbacks.onAccountChange(_account, _contract, _provider);
            }

            newCaptchaChallenge(_contract, _provider);
        });
    };

    const onCaptchaSolutionClick = (index: number) => {
        const _captchaSolution = captchaSolution.includes(index) ? captchaSolution.filter(item => item !== index) : [...captchaSolution, index];
        setCaptchaSolution(_captchaSolution);
        if (callbacks?.onClick) {
            callbacks.onClick(_captchaSolution);
        }
    };

    const newCaptchaChallenge = async (_contract: ProsopoContract, _provider: ProsopoRandomProviderResponse) => {
        if (callbacks?.onBeforeLoadCaptcha) {
            callbacks.onBeforeLoadCaptcha(_contract, _provider);
        }
        const proCaptcha = new ProCaptcha(_contract, _provider, providerApi);
        const _captchaChallenge = await proCaptcha.getCaptchaChallenge();
        setCaptchaChallenge(_captchaChallenge);
        if (callbacks?.onLoadCaptcha) {
            callbacks.onLoadCaptcha(_captchaChallenge);
        }
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
            
            {status.info && <Box className={"status"}>{status.info}</Box>}
            {status.error && <Box className={"status error"}>{status.error}</Box>}

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
                            {currentCaptchaIndex + 1 < totalCaptchas ? "Next" : "Submit"}
                        </Button>
                    </Box>
                    
                </Box>
            }
        </Box>
    );
}

export default ProCaptchaComponent;
