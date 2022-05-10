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

export interface callBacks {
    onSubmit?: (result: CaptchaSolutionResponse | Error, captchaIndex: number) => void;
    onCancel?: () => void;
    onSolved?: () => void;
    onReady?: (contractAddress: string, extension: Extension | null) => void;
    onAccountChange?: (account: InjectedAccountWithMeta | null,
        contract: ProsopoContract | null,
        provider: ProsopoRandomProviderResponse | null,
        captchaChallenge: ProsopoCaptchaResponse | null,
    ) => void;
    onRender?: (captchaChallenge: ProsopoCaptchaResponse | null, captchaSolution: number[], currentCaptchaIndex: number,
        account: InjectedAccountWithMeta | null,
        contract: ProsopoContract | null,
        provider: ProsopoRandomProviderResponse | null,
        extension: Extension | null,
    ) => void;
}

export function ProCaptchaComponent({ config, callBacks }: { config: ProCaptchaConfig, callBacks?: callBacks }) {

    const classes = useStyles();

    const [contractAddress, setContractAddress] = useState<string>('');
    const [contract, setContract] = useState<ProsopoContract | null>(null);
    const [extension, setExtension] = useState<Extension | null>(null);

    const [account, setAccount] = useState<InjectedAccountWithMeta | null>(null);

    const [totalCaptchas, setTotalCaptchas] = useState(0);
    const [currentCaptchaIndex, setCurrentCaptchaIndex] = useState(0);

    const [provider, setProvider] = useState<ProsopoRandomProviderResponse | null>(null);

    const [captchaChallenge, setCaptchaChallenge] = useState<ProsopoCaptchaResponse | null>(null);
    const [captchaSolution, setCaptchaSolution] = useState<number[]>([]);

    const providerApi = new ProviderApi(config);

    useEffect(() => {
        Promise.all([providerApi.getContractAddress(), getExtension()])
            .then(result => {
                const [_contractAddress, _extension] = result;
                setContractAddress(_contractAddress.contractAddress);
                setExtension(_extension);
                // setAccounts(_extension.getAllAcounts());
                console.log("CONTRACT ADDRESS", _contractAddress.contractAddress);

                if (callBacks?.onReady) {
                    callBacks.onReady(_contractAddress.contractAddress, _extension);
                }
            })
            .catch(err => {
                // TODO
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

    // const toggleShowCaptcha = () => {
    //     setShowCaptchas(!showCaptchas);
    //     setAccount(null);
    // };

    const cancelCaptcha = () => {
        setCaptchaChallenge(null);
        setAccount(null);
        setCurrentCaptchaIndex(0);

        if (callBacks?.onCancel) {
            callBacks.onCancel();
        }
    };

    const submitCaptcha = async () => {
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

        console.log("CAPTCHA SUBMIT RESULT", submitResult);

        if (callBacks?.onSubmit) {
            callBacks.onSubmit(submitResult, currentCaptchaIndex);
        }

        const nextCaptchaIndex = currentCaptchaIndex + 1;

        if (nextCaptchaIndex < totalCaptchas) {
            setCurrentCaptchaIndex(nextCaptchaIndex);
        } else {
            // TODO after all captchas solved.
            cancelCaptcha();
            if (callBacks?.onSolved) {
                callBacks.onSolved();
            }
        }
    };

    const onAccountChange = (e: SyntheticEvent<Element, Event>, account: any) => {
        if (!extension || !contractAddress) {
            return;
        }
        extension.setAccount(account.address).then(async (account) => {
            setAccount(account);

            const _contract = await getProsopoContract(contractAddress, config['dappAccount'], account);
            setContract(_contract);

            const _provider = await _contract.getRandomProvider();
            setProvider(_provider);

            console.log("PROVIDER", _provider);

            const proCaptcha = new ProCaptcha(_contract, _provider, providerApi);

            const _captchaChallenge = await proCaptcha.getCaptchaChallenge();

            setCaptchaChallenge(_captchaChallenge);

            if (callBacks?.onAccountChange) {
                callBacks.onAccountChange(account, _contract, _provider, _captchaChallenge);
            }
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
            {!account && (
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

            {account && (
                <Box className={classes.captchasContainer}>
                    <Box className={classes.captchasHeader}>
                        <Typography className={classes.captchasHeaderLabel}>
                            Select all images with a bus.
                        </Typography>
                    </Box>

                    <Box className={classes.captchasBody}>

                        {captchaChallenge && <CaptchaWidget challenge={captchaChallenge[currentCaptchaIndex]} solution={captchaSolution}
                            solutionClickEvent={onCaptchaSolutionClick} />}

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
            )}

        </Box>
    );
}

export default ProCaptchaComponent;
