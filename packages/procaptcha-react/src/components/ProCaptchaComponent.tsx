import { useState, useEffect, useContext, useReducer } from "react";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"; // TODO procaptcha types.

import { Box, Button, Typography } from "@mui/material";

import {
    ProsopoRandomProviderResponse,
    ProsopoCaptchaResponse,
    ProsopoContract,
    Extension,
    ProviderApi,
    getExtension,
    ProCaptcha,
    CaptchaSolutionResponse,
    TransactionResponse
} from "@prosopo/procaptcha";

import { ProCaptchaManager, IProCaptchaManager } from "./ProCaptchaManager";

import { CaptchaWidget } from "./CaptchaWidget";

import { useStyles } from "../styles";
import {
    CaptchaMerkleTree,
    CaptchaSolution,
    computeCaptchaSolutionHash,
    convertCaptchaToCaptchaSolution
} from "@prosopo/provider";

// TODO types.d.ts
export type TSubmitResult = [CaptchaSolutionResponse, TransactionResponse] | Error;
export type TExtensionAccount = InjectedAccountWithMeta;
export type TStatusReducer = {info?: string | [string, any], error?: string | [string, any]};
export type TStatusReducerState = {info?: string, error?: string};

export interface CaptchaEventCallbacks {
    onSubmit?: (result: TSubmitResult, captchaSolution: number[], captchaChallenge: ProsopoCaptchaResponse, captchaIndex: number) => void;
    onCancel?: () => void;
    onSolved?: () => void;
    onClick?: (captchaSolution: number[]) => void;
    onBeforeLoadCaptcha?: (contract: ProsopoContract, provider: ProsopoRandomProviderResponse) => void;
    onLoadCaptcha?: (captchaChallenge: ProsopoCaptchaResponse) => void;
    onLoadExtension?: (extension: Extension, contractAddress: string) => void;
    onAccountChange?: (account: TExtensionAccount,
        contract: ProsopoContract,
        provider: ProsopoRandomProviderResponse,
    ) => void;
}

const statusReducer = (state: TStatusReducerState, action: TStatusReducer) => {
    const logger = {info: console.log, error: console.error};
    for (const key in action) {
        logger[key](action[key]);
        return {[key]: Array.isArray(action[key]) ? String(action[key][1]) : String(action[key])};
    }
    return {};
}

export function ProCaptchaComponent({ callbacks }: { callbacks?: CaptchaEventCallbacks }) {

    const classes = useStyles();

    const context: IProCaptchaManager = useContext(ProCaptchaManager);
    const { config, contractAddress, account, contract, provider, extension } = context.state;

    const providerApi = new ProviderApi(config!);

    const [captchaChallenge, setCaptchaChallenge] = useState<ProsopoCaptchaResponse>();
    const [currentCaptchaIndex, setCurrentCaptchaIndex] = useState(0);
    const [currentCaptchaSolution, setCaptchaSolution] = useState<number[]>([]);
    const [captchaSolutions, setCaptchaSolutions] = useState<CaptchaSolution[]>([]);
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0;

    const [status, setStatus] = useReducer(statusReducer, {});

    useEffect(() => {

        if (!extension || !contract) {
            Promise.all([getExtension(), providerApi.getContractAddress()])
                .then(([extension, { contractAddress }]) => {

                    context.dispatch({extension, contractAddress});

                    if (callbacks?.onLoadExtension) {
                        callbacks.onLoadExtension(extension, contractAddress);
                    }
                })
                .catch(err => {
                    setStatus({error: ["FAILED TO GET CONTRACT ADDRESS", err.message]});
                });
            return;
        }

        context.dispatch({contractAddress: contract.address});

    }, []);

    useEffect(() => {
        if (!captchaChallenge && contract && provider) {
            newCaptchaChallenge(contract, provider);
        }
    }, [contract, provider]);

    const newCaptchaChallenge = async (_contract: ProsopoContract, _provider: ProsopoRandomProviderResponse) => {
        if (callbacks?.onBeforeLoadCaptcha) {
            callbacks.onBeforeLoadCaptcha(_contract, _provider);
        }
        const proCaptcha = new ProCaptcha(_contract, _provider, providerApi);
        const _captchaChallenge = await proCaptcha.getCaptchaChallenge();
        setCaptchaChallenge(_captchaChallenge);
        setCurrentCaptchaIndex(0);
        if (callbacks?.onLoadCaptcha) {
            callbacks.onLoadCaptcha(_captchaChallenge);
        }
    };

    const dismissCaptcha = () => {
        setCaptchaChallenge(undefined);
    }

    const cancelCaptcha = () => {
        dismissCaptcha();
        if (callbacks?.onCancel) {
            callbacks.onCancel();
        }
    };

    // TODO manager event...
    const submitCaptcha = async () => {
        if (!extension || !contract || !provider || !captchaChallenge) {
            return;
        }

        if (nextCaptchaIndex < totalCaptchas) {
            setCaptchaSolution([]);
            setCurrentCaptchaIndex(nextCaptchaIndex);

        } else {
        const signer = extension.getInjected().signer;
        const proCaptcha = new ProCaptcha(contract, provider, providerApi);
        const currentCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
        const { datasetId } = currentCaptcha.captcha;

        // TODO loading...

        let submitResult: [CaptchaSolutionResponse, TransactionResponse] | Error;

        try {
            submitResult = await proCaptcha.solveCaptchaChallenge(signer, captchaChallenge.requestHash, datasetId, currentCaptchaSolution);
            setStatus({info: ["SUBMIT CAPTCHA RESULT", submitResult[0].status]});
        } catch (err) {
            submitResult = err as Error;
            setStatus({error: ["FAILED TO SUBMIT CAPTCHA", submitResult.message]});
        }

        if (callbacks?.onSubmit) {
            callbacks.onSubmit(submitResult, currentCaptchaSolution, captchaChallenge, currentCaptchaIndex);
        }

        setCaptchaSolution([]);

        const nextCaptchaIndex = currentCaptchaIndex + 1;


        } else {
            if (callbacks?.onSolved) {
                callbacks.onSolved();
            }
            // TODO after all captchas solved.
            setStatus({info: "All captchas answered..."});
            dismissCaptcha();
        }
    };

    const onCaptchaSolutionClick = (index: number) => {
        const _captchaSolution = currentCaptchaSolution.includes(index) ? currentCaptchaSolution.filter(item => item !== index) : [...currentCaptchaSolution, index];
        setCaptchaSolution(_captchaSolution);
        if (callbacks?.onClick) {
            callbacks.onClick(_captchaSolution);

        console.log("SOLUTION", captchaSolution);
        if (captchaChallenge && "captchas" in captchaChallenge) {
            const solvedCaptcha = captchaChallenge.captchas[currentCaptchaIndex];
            const _captchaSolution = captchaSolution.includes(index) ? captchaSolution.filter(item => item !== index) : [...captchaSolution, index];
            console.log("Solution", _captchaSolution);
            solvedCaptcha.captcha.solution = _captchaSolution
            let _captchaSolutions = [...captchaSolutions]
            _captchaSolutions[currentCaptchaIndex] = convertCaptchaToCaptchaSolution(solvedCaptcha.captcha);
            console.log("SOLVED CAPTCHA", solvedCaptcha.captcha);
            console.log("CAPTCHA SOLUTIONS", _captchaSolutions);
            setCaptchaSolution(_captchaSolution);
            setCaptchaSolutions(_captchaSolutions);
            if (callbacks?.onClick) {
                callbacks.onClick(_captchaSolution);
            }
        } else {
            console.log("CaptchaChallenge", captchaChallenge)
            console.log("Current captcha index", currentCaptchaIndex)
            throw Error(`Error setting solution: ${index}`)
        }
    };

    return (
        <Box className={classes.root}>

            {status.info && <Box className={"status"}>{status.info}</Box>}
            {status.error && <Box className={"status error"}>{status.error}</Box>}

            {account && captchaChallenge &&
                <Box className={classes.captchasContainer}>

                    <Box className={classes.captchasHeader}>
                        <Typography className={classes.captchasHeaderLabel}>
                            Select all images with a {captchaChallenge.captchas[currentCaptchaIndex].captcha.target}
                        </Typography>
                    </Box>

                    <Box className={classes.captchasBody}>

                        <CaptchaWidget challenge={captchaChallenge.captchas[currentCaptchaIndex]} solution={currentCaptchaSolution} solutionClickEvent={onCaptchaSolutionClick} />

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
